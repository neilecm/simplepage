// Simple in-memory rate limiter by IP + route. Netlify functions are ephemeral, so
// this is best-effort only. For stronger guarantees, use a KV/DB-backed counter.

const buckets = new Map();

export function rateLimit(key, { windowMs = 60000, max = 30 } = {}) {
  const now = Date.now();
  const b = buckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > b.reset) {
    b.count = 0;
    b.reset = now + windowMs;
  }
  b.count += 1;
  buckets.set(key, b);
  const remaining = Math.max(0, max - b.count);
  return { limited: b.count > max, remaining, reset: b.reset };
}

