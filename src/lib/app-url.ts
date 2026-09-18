import "server-only";
import { headers } from "next/headers";

/** URL publique de l'application (pour les liens et QR codes de session). */
export async function getAppUrl() {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
