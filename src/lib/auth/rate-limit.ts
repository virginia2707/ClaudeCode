// Limiteur de débit en mémoire (fenêtre glissante simple). Suffisant pour une
// instance ; remplacer par Redis pour un déploiement multi-instance.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

// Nettoyage périodique pour éviter la croissance infinie.
if (typeof setInterval === "function") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }, 60_000);
  if (typeof timer === "object" && timer && "unref" in timer) timer.unref();
}
