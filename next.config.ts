import type { NextConfig } from "next";

// Politique de sécurité du contenu. Next.js injecte des scripts en ligne pour
// l'hydratation : 'unsafe-inline' reste nécessaire tant qu'un nonce n'est pas
// généré par requête. Les directives restrictives ci-dessous ferment en
// revanche des vecteurs concrets : iframes tierces, balise <base> injectée,
// plugins, et envoi de formulaire vers un domaine externe.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  experimental: {
    // Nécessaire pour forbidden() / unauthorized() (gardes de rôle).
    authInterrupts: true,
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
