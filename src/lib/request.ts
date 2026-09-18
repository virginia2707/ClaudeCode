import "server-only";
import { headers } from "next/headers";

/** Adresse IP approximative du client (derrière un proxy de confiance). */
export async function getClientIp() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
