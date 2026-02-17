/**
 * Smart Fetch Retry — exponential backoff with jitter for external HTTP calls.
 * Handles transient network errors, 429s, and 5xx responses gracefully.
 */

interface FetchRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

const DEFAULT_OPTIONS: Required<FetchRetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 15000,
};

/** Check if an HTTP status code is retryable */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504 || status === 408;
}

/** Check if an error is a transient network error worth retrying */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('network') ||
    msg.includes('socket hang up') ||
    msg.includes('aborted')
  );
}

/** Exponential backoff with jitter */
function getDelay(attempt: number, baseMs: number, maxMs: number): number {
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * exponential * 0.3;
  return Math.min(exponential + jitter, maxMs);
}

/**
 * Fetch with automatic retry on transient failures.
 * Drop-in replacement for `fetch()` with retry logic.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: FetchRetryOptions,
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Success or non-retryable error — return immediately
      if (response.ok || !isRetryableStatus(response.status)) {
        return response;
      }

      // Retryable HTTP status — wait and retry
      if (attempt < opts.maxRetries) {
        const delay = getDelay(attempt, opts.baseDelayMs, opts.maxDelayMs);
        console.warn(`[fetchRetry] ${url} returned ${response.status}. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${opts.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response; // Last attempt — return whatever we got
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < opts.maxRetries && isRetryableError(error)) {
        const delay = getDelay(attempt, opts.baseDelayMs, opts.maxDelayMs);
        console.warn(`[fetchRetry] ${url} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${opts.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error(`fetchWithRetry: all ${opts.maxRetries} retries exhausted for ${url}`);
}
