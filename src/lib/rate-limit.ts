const buckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const prev = buckets.get(key) ?? [];
  const valid = prev.filter((t) => now - t < windowMs);
  if (valid.length >= limit) {
    buckets.set(key, valid);
    return { allowed: false, remaining: 0 };
  }
  valid.push(now);
  buckets.set(key, valid);
  return { allowed: true, remaining: Math.max(0, limit - valid.length) };
}
