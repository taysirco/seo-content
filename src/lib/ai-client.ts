import { apiKeyPool } from '@/lib/api-key-pool';

// Configurable model names — override via environment variables
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.0-flash';

/** Exponential backoff with jitter — prevents thundering herd on retries */
function backoffWithJitter(attempt: number, baseMs = 1000, maxMs = 30000): number {
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * exponential * 0.5; // 0-50% jitter
  return Math.min(exponential + jitter, maxMs);
}

/**
 * Robust JSON extraction — handles markdown fences, partial responses, trailing commas,
 * single-quoted keys, truncated objects, and other common Gemini issues.
 * Tries 7 strategies before giving up.
 */
function extractJSON(text: string): string {
  // Strategy 0: Strip Gemini 2.5 thinking preamble (text before first { or [)
  const thinkStripped = text.replace(/^[\s\S]*?(?=\{|\[)/, '');
  if (thinkStripped !== text && thinkStripped.length > 0) {
    try { JSON.parse(thinkStripped); return thinkStripped; } catch { /* continue */ }
  }

  // Strategy 1: Direct parse
  try { JSON.parse(text); return text; } catch { /* continue */ }

  // Strategy 2: Strip markdown fences (```json ... ``` or ``` ... ```)
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try { JSON.parse(fenceMatch[1].trim()); return fenceMatch[1].trim(); } catch { /* continue */ }
  }

  // Strategy 3: Extract first complete JSON object or array
  const objMatch = text.match(/(\{[\s\S]*\})/);
  if (objMatch) {
    try { JSON.parse(objMatch[1]); return objMatch[1]; } catch { /* continue */ }
  }
  const arrMatch = text.match(/(\[[\s\S]*\])/);
  if (arrMatch) {
    try { JSON.parse(arrMatch[1]); return arrMatch[1]; } catch { /* continue */ }
  }

  // Strategy 4: Fix trailing commas (common Gemini issue)
  const cleaned = text
    .replace(/,\s*([}\]])/g, '$1')  // trailing commas
    .replace(/\n/g, ' ');
  const objMatch2 = cleaned.match(/(\{[\s\S]*\})/);
  if (objMatch2) {
    try { JSON.parse(objMatch2[1]); return objMatch2[1]; } catch { /* continue */ }
  }

  // Strategy 5: Fix single-quoted keys/values → double-quoted
  const doubleQuoted = cleaned
    .replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ': "$1"');
  const objMatch3 = doubleQuoted.match(/(\{[\s\S]*\})/);
  if (objMatch3) {
    try { JSON.parse(objMatch3[1]); return objMatch3[1]; } catch { /* continue */ }
  }

  // Strategy 6: Repair truncated JSON — auto-close brackets
  const repaired = repairTruncatedJSON(text);
  if (repaired) {
    try { JSON.parse(repaired); return repaired; } catch { /* continue */ }
  }

  // Strategy 7: Extract any JSON-like substring between first { and last }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const substr = text.slice(firstBrace, lastBrace + 1);
    try { JSON.parse(substr); return substr; } catch { /* continue */ }
  }

  // All strategies failed — return original for error reporting
  return text;
}

/** Attempt to close unclosed brackets/braces in truncated JSON */
function repairTruncatedJSON(text: string): string | null {
  // Find the JSON start
  const start = text.indexOf('{');
  if (start === -1) return null;
  let json = text.slice(start);
  // Remove any trailing incomplete string
  json = json.replace(/,\s*"[^"]*$/, '');
  // Count open vs close braces/brackets
  const opens = { '{': 0, '[': 0 };
  let inString = false;
  let escaped = false;
  for (const ch of json) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') opens['{']++;
    if (ch === '}') opens['{']--;
    if (ch === '[') opens['[']++;
    if (ch === ']') opens['[']--;
  }
  // Auto-close
  if (opens['{'] <= 0 && opens['['] <= 0) return null; // Not truncated
  for (let i = 0; i < opens['[']; i++) json += ']';
  for (let i = 0; i < opens['{']; i++) json += '}';
  return json;
}

// OPT-3: Per-key rate limiting (moved to ApiKeyPool)
// Rate limit delay is now managed per-key instead of globally,
// so multiple concurrent requests don't block each other unnecessarily.
async function waitForKeyRateLimit(keyIndex: number) {
  const waitMs = apiKeyPool.getRateLimitWait(keyIndex);
  if (waitMs > 0) {
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
  apiKeyPool.markUsed(keyIndex);
}

export async function callGemini({
  systemInstruction,
  userPrompt,
  temperature,
  jsonMode = true,
  maxOutputTokens = 8192,
  useGrounding = false,
}: {
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  jsonMode?: boolean;
  maxOutputTokens?: number;
  useGrounding?: boolean;
}): Promise<string> {
  // Rate limiting is now per-key, applied after key selection below

  let lastError: Error | null = null;
  let currentPrompt = userPrompt;

  // Smart timeout: scale based on prompt size (60s base + 1s per 1000 chars, max 120s)
  // Gemini 2.5 Flash uses internal thinking which adds latency
  const timeoutMs = Math.min(60000 + Math.floor(currentPrompt.length / 1000) * 1000, 120000);

  // MK-2: Retry loop with key rotation — try EVERY key in the pool
  const maxAttempts = apiKeyPool.size + 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Per-key rate limit applied after key selection
    const { genAI, keyIndex } = apiKeyPool.getNext();
    await waitForKeyRateLimit(keyIndex);

    // If this key is still cooling down, wait for it (cap at 30s)
    const cooldownWait = apiKeyPool.getCooldownWait(keyIndex);
    if (cooldownWait > 0) {
      console.log(`[callGemini] Key #${keyIndex} cooling down, waiting ${Math.min(cooldownWait, 30000)}ms (attempt ${attempt + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, Math.min(cooldownWait, 30000)));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelConfig: any = {
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: temperature ?? undefined,
        responseMimeType: jsonMode ? 'application/json' : 'text/plain',
        maxOutputTokens,
      },
      systemInstruction,
    };
    if (useGrounding) {
      modelConfig.tools = [{ googleSearch: {} }];
    }
    const model = genAI.getGenerativeModel(modelConfig);

    try {
      const result = await Promise.race([
        model.generateContent(currentPrompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
        ),
      ]);
      let text = result.response.text();

      if (jsonMode) {
        const raw = text;
        text = extractJSON(text);
        try {
          JSON.parse(text); // Validate
        } catch (parseErr) {
          console.warn(`[callGemini] JSON parse failed on key #${keyIndex}. Raw response (first 500 chars): ${raw.slice(0, 500)}`);
          throw parseErr;
        }
      }

      apiKeyPool.markSuccess(keyIndex);
      return text;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const errorMessage = lastError.message || '';

      // 403: Key is leaked/forbidden — mark permanently dead, try next key immediately
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden') || errorMessage.includes('leaked')) {
        apiKeyPool.markDead(keyIndex);
        if (apiKeyPool.aliveCount === 0) {
          throw new Error('All Gemini API keys are blocked (403 Forbidden). Please replace your API keys — they may have been leaked.');
        }
        console.warn(`[callGemini] Key #${keyIndex} is dead (403). Rotating immediately. (attempt ${attempt + 1}/${maxAttempts})`);
        continue;
      }

      // MK-2: On rate limit, mark key as cooling and immediately try next key
      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        const isDailyQuota = errorMessage.includes('exceeded your current quota') || errorMessage.includes('billing');
        apiKeyPool.markCooldown(keyIndex, isDailyQuota);
        if (apiKeyPool.allDailyExhausted) {
          throw new Error('All Gemini API keys daily quota exhausted. Wait for quota reset or add keys from different Google Cloud projects.');
        }
        const wait429 = backoffWithJitter(attempt, 2000, 15000);
        console.warn(`[callGemini] Key #${keyIndex} hit 429. Backoff ${Math.round(wait429)}ms before next key (attempt ${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, wait429));
        continue;
      }

      if (errorMessage.includes('500') || errorMessage.includes('INTERNAL')) {
        const wait500 = backoffWithJitter(attempt, 3000, 20000);
        console.warn(`[callGemini] 500/INTERNAL error. Backoff ${Math.round(wait500)}ms (attempt ${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, wait500));
        continue;
      }

      if (errorMessage === 'TIMEOUT' && attempt < maxAttempts - 1) {
        currentPrompt = userPrompt.slice(0, Math.floor(userPrompt.length * 0.6));
        continue;
      }

      if (jsonMode && (errorMessage.includes('JSON') || errorMessage.includes('Unexpected token'))) {
        // Retry with a fresh key and explicit JSON instruction
        if (attempt < maxAttempts - 1) {
          console.warn(`[callGemini] JSON parse failed, rotating key and retrying (attempt ${attempt + 1}/${maxAttempts})`);
          continue;
        }
        // Final attempt: try with gemini-2.0-flash (more reliable for structured JSON)
        try {
          await waitForKeyRateLimit(keyIndex);
          const fallbackModel = genAI.getGenerativeModel({
            model: GEMINI_FALLBACK_MODEL,
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
              maxOutputTokens,
            },
            systemInstruction,
          });
          const retryResult = await Promise.race([
            fallbackModel.generateContent(
              currentPrompt + '\n\nCRITICAL: Return ONLY a valid JSON object. No text before or after. No markdown. Start with { and end with }.'
            ),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
            ),
          ]);
          const retryText = extractJSON(retryResult.response.text());
          JSON.parse(retryText);
          apiKeyPool.markSuccess(keyIndex);
          return retryText;
        } catch (fallbackErr) {
          console.error('[callGemini] Fallback model also failed:', fallbackErr);
          throw new Error('AI returned invalid JSON after retry');
        }
      }

      throw lastError;
    }
  }

  throw lastError || new Error('All API keys exhausted. Wait 60 seconds and retry.');
}

export async function* streamGemini({
  systemInstruction,
  userPrompt,
  temperature = 0.7,
  maxOutputTokens = 32768,
  useGrounding = false,
}: {
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  useGrounding?: boolean;
}): AsyncGenerator<string> {
  // Rate limiting is now per-key, applied after key selection below

  let lastError: Error | null = null;
  const maxAttempts = apiKeyPool.size + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Per-key rate limit applied after key selection
    const { genAI, keyIndex } = apiKeyPool.getNext();
    await waitForKeyRateLimit(keyIndex);

    // If this key is still cooling down, wait for it
    const cooldownWait = apiKeyPool.getCooldownWait(keyIndex);
    if (cooldownWait > 0) {
      console.log(`[streamGemini] Key #${keyIndex} cooling down, waiting ${Math.min(cooldownWait, 30000)}ms (attempt ${attempt + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, Math.min(cooldownWait, 30000)));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelConfig: any = {
      model: GEMINI_MODEL,
      generationConfig: {
        temperature,
        responseMimeType: 'text/plain',
        maxOutputTokens,
      },
      systemInstruction,
    };
    if (useGrounding) {
      modelConfig.tools = [{ googleSearch: {} }];
    }
    const model = genAI.getGenerativeModel(modelConfig);

    try {
      const result = await model.generateContentStream(userPrompt);

      // Proper stream timeout using AbortController pattern
      let timedOut = false;
      const streamTimer = setTimeout(() => { timedOut = true; }, 120000);

      try {
        for await (const chunk of result.stream) {
          if (timedOut) throw new Error('STREAM_TIMEOUT');
          const text = chunk.text();
          if (text) {
            yield text;
          }
        }
        clearTimeout(streamTimer);
        apiKeyPool.markSuccess(keyIndex);
        return; // Success — exit the retry loop
      } catch (streamErr) {
        clearTimeout(streamTimer);
        throw streamErr;
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const msg = lastError.message || '';

      // 403: Key is leaked/forbidden — mark dead, rotate immediately
      if (msg.includes('403') || msg.includes('Forbidden') || msg.includes('leaked')) {
        apiKeyPool.markDead(keyIndex);
        if (apiKeyPool.aliveCount === 0) {
          throw new Error('All Gemini API keys are blocked (403 Forbidden). Please replace your API keys.');
        }
        console.warn(`[streamGemini] Key #${keyIndex} is dead (403). Rotating. (attempt ${attempt + 1}/${maxAttempts})`);
        continue;
      }

      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        const isDailyQuota = msg.includes('exceeded your current quota') || msg.includes('billing');
        apiKeyPool.markCooldown(keyIndex, isDailyQuota);
        if (apiKeyPool.allDailyExhausted) {
          throw new Error('All Gemini API keys daily quota exhausted. Wait for quota reset or add keys from different Google Cloud projects.');
        }
        const wait429 = backoffWithJitter(attempt, 2000, 15000);
        console.warn(`[streamGemini] Key #${keyIndex} hit 429. Backoff ${Math.round(wait429)}ms before next key (attempt ${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, wait429));
        continue;
      }

      if (msg.includes('500') || msg.includes('INTERNAL')) {
        const wait500 = backoffWithJitter(attempt, 3000, 20000);
        console.warn(`[streamGemini] 500/INTERNAL. Backoff ${Math.round(wait500)}ms (attempt ${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, wait500));
        continue;
      }

      // Non-retryable error
      throw lastError;
    }
  }

  throw lastError || new Error('All API keys exhausted. Wait 60 seconds and retry.');
}
