import "server-only";
import { headers } from "next/headers";

// Limiteur en mémoire (fenêtre glissante simple). Suffisant pour une instance ;
// à remplacer par un adaptateur Redis/Upstash derrière la même fonction en prod
// multi-instances.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitRule = { key: string; limit: number; windowMs: number };

// Les seuils dépendent du déploiement (derrière un proxy partagé, une salle de
// formation entière sort par la même IP). Ils sont donc configurables, avec des
// valeurs par défaut prudentes.
function envLimit(name: string, fallback: number) {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const RATE_LIMITS = {
  login: { key: "login", limit: envLimit("RATE_LIMIT_LOGIN", 10), windowMs: 15 * 60 * 1000 },
  register: { key: "register", limit: envLimit("RATE_LIMIT_REGISTER", 5), windowMs: 60 * 60 * 1000 },
  invite: { key: "invite", limit: envLimit("RATE_LIMIT_INVITE", 30), windowMs: 60 * 60 * 1000 },
} satisfies Record<string, RateLimitRule>;

export function consume(rule: RateLimitRule, subject: string, now = Date.now()) {
  const id = `${rule.key}:${subject}`;
  const bucket = buckets.get(id);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + rule.windowMs });
    return { allowed: true, remaining: rule.limit - 1, retryAfterMs: 0 };
  }
  if (bucket.count >= rule.limit) {
    return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true, remaining: rule.limit - bucket.count, retryAfterMs: 0 };
}

export function resetRateLimits() {
  buckets.clear();
}

export async function clientSubject() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : h.get("x-real-ip")) ?? "local";
}

export async function enforceRateLimit(rule: RateLimitRule, extra = "") {
  const subject = `${await clientSubject()}${extra ? `:${extra}` : ""}`;
  const res = consume(rule, subject);
  if (!res.allowed) {
    const minutes = Math.max(1, Math.ceil(res.retryAfterMs / 60000));
    return `Trop de tentatives. Réessayez dans ${minutes} min.`;
  }
  return null;
}
