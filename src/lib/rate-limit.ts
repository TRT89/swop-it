/**
 * Minimal in-memory rate limiter for sensitive actions (login, signup, reports).
 * Single-process only, which is exactly what this prototype runs as. Swap for a
 * shared store if Swop-it is ever deployed across multiple instances.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  bucket.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}
