/** Per-key sliding window. 429 must never return VALID. */

export type RateLimitDecision = { ok: true } | { ok: false; retryAfterSec: number };

export function createRateLimiter(input?: { windowMs?: number; max?: number; now?: () => number }) {
  const windowMs = input?.windowMs ?? 60_000;
  const max = input?.max ?? Number(process.env.RATE_LIMIT_PER_MIN ?? 60);
  const hits = new Map<string, number[]>();
  const clock = input?.now ?? Date.now;
  return {
    allow(key: string): RateLimitDecision {
      const now = clock();
      const cutoff = now - windowMs;
      const prev = (hits.get(key) ?? []).filter((t) => t > cutoff);
      if (prev.length >= max) {
        const retryAfterSec = Math.max(1, Math.ceil((prev[0]! + windowMs - now) / 1000));
        hits.set(key, prev);
        return { ok: false, retryAfterSec };
      }
      prev.push(now);
      hits.set(key, prev);
      return { ok: true };
    },
  };
}

export const verifierRateLimiter = createRateLimiter();
