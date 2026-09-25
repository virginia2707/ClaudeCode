import "server-only";
import type { NextRequest } from "next/server";

/**
 * Defense-in-depth CSRF check for API routes reached via plain `fetch()`
 * (not Next.js Server Actions, which already verify same-origin natively).
 * The player/session cookies are `sameSite: "lax"`, which already stops
 * them from being sent on a cross-site POST — this is a second, independent
 * layer in case that cookie attribute is ever relaxed or a proxy rewrites it.
 *
 * Modern browsers always set `Origin` on same-origin and cross-origin
 * fetch/XHR requests, so a missing header is treated as suspicious rather
 * than assumed to be a legitimate old browser (these routes are only ever
 * called from this app's own client-side `fetch()` calls).
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}
