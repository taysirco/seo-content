/**
 * Shared API error handler — user-friendly English messages
 */
export function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED') || raw.includes('exceeded your current quota')) {
    if (raw.includes('exceeded your current quota') || raw.includes('billing') || raw.includes('GenerateContent') === false && raw.includes('quota')) {
      return 'Daily Gemini quota exhausted. ' +
        '1) Wait until quota resets (midnight Pacific). ' +
        '2) Create keys from different Google Cloud projects. ' +
        '3) Enable a paid plan on ai.google.dev.';
    }
    return 'Rate limit exceeded. Wait 60 seconds and retry.';
  }
  if (raw.includes('TIMEOUT') || raw.includes('timeout') || raw.includes('AbortError')) {
    return 'Connection timeout. Check your internet and retry.';
  }
  if (raw.includes('INTERNAL') || /\b500\b/.test(raw)) {
    return 'Temporary AI server error. Retry shortly.';
  }
  if (raw.includes('NetworkError') || raw.includes('fetch failed') || raw.includes('ECONNREFUSED')) {
    return 'Network error. Check your connection.';
  }
  if (raw.includes('API key not valid') || raw.includes('API_KEY_INVALID')) {
    return 'Invalid API key. Check GEMINI_API_KEY in .env.local.';
  }

  return raw;
}
