import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * MK-1: Intelligent Multi-Key API Pool Manager
 * - Round-robin rotation across 12 Gemini API keys
 * - Auto-cooldown on 429/RESOURCE_EXHAUSTED (60s per key)
 * - Per-key GoogleGenerativeAI instance cache
 * - Usage tracking for debugging
 * - Fallback to single GEMINI_API_KEY if GEMINI_API_KEYS is not set
 */

interface KeyState {
  key: string;
  instance: GoogleGenerativeAI;
  cooldownUntil: number;  // timestamp when cooldown expires (0 = available)
  dailyExhausted: boolean; // true if daily quota is used up
  dead: boolean; // true if key is permanently blocked (403 leaked/forbidden)
  callCount: number;
  lastUsed: number;
  lastCallTime: number; // per-key rate limiting timestamp
  errors429: number;
  consecutiveErrors: number; // tracks consecutive 429s for progressive cooldown
  successCount: number;
}

const COOLDOWN_MS = 60_000; // 60 seconds — Gemini free tier rate limit window

class ApiKeyPool {
  private keys: KeyState[] = [];
  private currentIndex = 0;
  private initialized = false;

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    // Try GEMINI_API_KEYS first (comma-separated), fallback to single GEMINI_API_KEY
    const multiKeys = process.env.GEMINI_API_KEYS;
    const singleKey = process.env.GEMINI_API_KEY;

    let rawKeys: string[] = [];
    if (multiKeys) {
      rawKeys = multiKeys.split(',').map(k => k.trim()).filter(Boolean);
    }
    if (rawKeys.length === 0 && singleKey) {
      rawKeys = [singleKey.trim()];
    }
    if (rawKeys.length === 0) {
      throw new Error('No Gemini API keys configured. Set GEMINI_API_KEYS or GEMINI_API_KEY in .env.local');
    }

    // Deduplicate keys
    const uniqueKeys = [...new Set(rawKeys)];

    this.keys = uniqueKeys.map(key => ({
      key,
      instance: new GoogleGenerativeAI(key),
      cooldownUntil: 0,
      dailyExhausted: false,
      dead: false,
      callCount: 0,
      lastUsed: 0,
      lastCallTime: 0,
      errors429: 0,
      consecutiveErrors: 0,
      successCount: 0,
    }));

    console.log(`[ApiKeyPool] Initialized with ${this.keys.length} key(s)`);
  }

  /** Get the next available GenAI instance (round-robin with cooldown skip) */
  getNext(): { genAI: GoogleGenerativeAI; keyIndex: number } {
    this.init();

    const now = Date.now();
    const total = this.keys.length;

    // Try round-robin starting from currentIndex — skip daily-exhausted keys
    for (let i = 0; i < total; i++) {
      const idx = (this.currentIndex + i) % total;
      const state = this.keys[idx];

      // Skip dead or daily-exhausted keys
      if (state.dead || state.dailyExhausted) continue;

      if (state.cooldownUntil <= now) {
        // This key is available — reset consecutive errors on successful pick
        state.callCount++;
        state.lastUsed = now;
        this.currentIndex = (idx + 1) % total;
        return { genAI: state.instance, keyIndex: idx };
      }
    }

    // ALL keys are cooling down — find the one that expires soonest (skip daily-exhausted)
    const available = this.keys.filter(k => !k.dailyExhausted && !k.dead);
    if (available.length === 0) {
      // All keys daily-exhausted — return first key anyway, caller will see allDailyExhausted
      const idx = 0;
      this.keys[idx].callCount++;
      this.keys[idx].lastUsed = now;
      this.currentIndex = 1 % total;
      return { genAI: this.keys[idx].instance, keyIndex: idx };
    }
    const soonest = available.reduce((min, k) =>
      k.cooldownUntil < min.cooldownUntil ? k : min
    );
    const waitMs = Math.max(0, soonest.cooldownUntil - now);
    console.warn(`[ApiKeyPool] All ${available.length} available keys cooling down. Shortest wait: ${waitMs}ms`);

    // Return the soonest key anyway — the caller will handle the delay
    const idx = this.keys.indexOf(soonest);
    soonest.callCount++;
    soonest.lastUsed = now;
    this.currentIndex = (idx + 1) % total;
    return { genAI: soonest.instance, keyIndex: idx };
  }

  /** Mark a key as rate-limited with progressive cooldown */
  markCooldown(keyIndex: number, isDailyQuota = false) {
    if (keyIndex >= 0 && keyIndex < this.keys.length) {
      const key = this.keys[keyIndex];
      key.errors429++;
      key.consecutiveErrors++;
      if (isDailyQuota) {
        key.dailyExhausted = true;
        key.cooldownUntil = Date.now() + 3_600_000; // 1 hour
        console.warn(`[ApiKeyPool] Key #${keyIndex} DAILY QUOTA EXHAUSTED.`);
      } else {
        // Progressive cooldown: escalate on repeated 429s (60s, 120s, 240s, max 300s)
        const multiplier = Math.min(Math.pow(2, key.consecutiveErrors - 1), 5);
        const cooldown = COOLDOWN_MS * multiplier;
        key.cooldownUntil = Date.now() + cooldown;
        console.warn(`[ApiKeyPool] Key #${keyIndex} hit rate limit (${key.consecutiveErrors}x). Cooling for ${cooldown / 1000}s.`);
      }
    }
  }

  /** Mark a key as successful — resets progressive cooldown */
  markSuccess(keyIndex: number) {
    if (keyIndex >= 0 && keyIndex < this.keys.length) {
      this.keys[keyIndex].consecutiveErrors = 0;
      this.keys[keyIndex].successCount++;
    }
  }

  /** Mark a key as permanently dead (403 forbidden / leaked) — never use again */
  markDead(keyIndex: number) {
    if (keyIndex >= 0 && keyIndex < this.keys.length) {
      this.keys[keyIndex].dead = true;
      console.warn(`[ApiKeyPool] Key #${keyIndex} PERMANENTLY DISABLED (403 forbidden/leaked). ${this.aliveCount} key(s) remaining.`);
    }
  }

  /** Count of non-dead keys */
  get aliveCount(): number {
    this.init();
    return this.keys.filter(k => !k.dead).length;
  }

  /** Reset daily exhaustion flags — call at midnight or when user adds new keys */
  resetDailyExhaustion() {
    for (const key of this.keys) {
      key.dailyExhausted = false;
      key.consecutiveErrors = 0;
      key.cooldownUntil = 0;
    }
    console.log('[ApiKeyPool] Daily exhaustion flags reset.');
  }

  /** Check if ALL keys are daily-exhausted — caller should abort immediately */
  get allDailyExhausted(): boolean {
    this.init();
    return this.keys.length > 0 && this.keys.every(k => k.dailyExhausted || k.dead);
  }

  /** Get the wait time if the selected key is still cooling down */
  getCooldownWait(keyIndex: number): number {
    if (keyIndex >= 0 && keyIndex < this.keys.length) {
      return Math.max(0, this.keys[keyIndex].cooldownUntil - Date.now());
    }
    return 0;
  }

  /** Get pool stats for debugging */
  getStats() {
    this.init();
    return this.keys.map((k, i) => ({
      index: i,
      callCount: k.callCount,
      successCount: k.successCount,
      errors429: k.errors429,
      consecutiveErrors: k.consecutiveErrors,
      isCooling: k.cooldownUntil > Date.now(),
      dead: k.dead,
      dailyExhausted: k.dailyExhausted,
      cooldownRemaining: Math.max(0, k.cooldownUntil - Date.now()),
      healthScore: k.callCount > 0 ? Math.round((k.successCount / k.callCount) * 100) : 100,
      keyPrefix: k.key.slice(0, 10) + '...',
    }));
  }

  get size(): number {
    this.init();
    return this.keys.length;
  }

  /** Per-key rate limit delay based on pool size */
  private getRateLimitDelay(): number {
    const poolSize = this.keys.filter(k => !k.dead).length;
    if (poolSize <= 1) return 4500;  // 1 key: ~13 RPM
    if (poolSize <= 3) return 2000;  // 3 keys: ~30 RPM
    if (poolSize <= 6) return 1000;  // 6 keys: ~60 RPM
    return 500;                       // 12+ keys: ~120 RPM
  }

  /** Get how long to wait before using this key (per-key rate limiting) */
  getRateLimitWait(keyIndex: number): number {
    this.init();
    if (keyIndex < 0 || keyIndex >= this.keys.length) return 0;
    const key = this.keys[keyIndex];
    const delay = this.getRateLimitDelay();
    const timeSinceLastCall = Date.now() - key.lastCallTime;
    return Math.max(0, delay - timeSinceLastCall);
  }

  /** Mark a key as just used for rate limiting */
  markUsed(keyIndex: number) {
    if (keyIndex >= 0 && keyIndex < this.keys.length) {
      this.keys[keyIndex].lastCallTime = Date.now();
    }
  }
}

// Singleton pool instance
export const apiKeyPool = new ApiKeyPool();
