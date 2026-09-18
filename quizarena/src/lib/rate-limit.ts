// Minimal in-memory sliding-window rate limiter (single instance).
// Swap for a Redis-backed implementation behind the same function for multi-instance deployments.
import { headers } from "next/headers";

type Bucket = { hits: number[]; };
const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_KEYS) buckets.clear();
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    return { ok: false, retryAfterMs: windowMs - (now - bucket.hits[0]) };
  }
  bucket.hits.push(now);
  return { ok: true, retryAfterMs: 0 };
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

/** Reset (tests only). */
export function _resetRateLimits() {
  buckets.clear();
}
