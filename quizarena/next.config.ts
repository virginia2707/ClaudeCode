import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Non-nonce CSP (see node_modules/next/dist/docs/.../content-security-policy.md
// "Without Nonces"): a nonce-based policy would force every page to render
// dynamically, which would cost the static generation this app otherwise
// gets for the landing/marketing pages. 'unsafe-inline' is required because
// React/Next inject inline bootstrap scripts and this app uses inline
// `style` attributes (progress bars, dynamic gradients) with no nonce
// plumbing. It still meaningfully restricts the app's actual attack surface:
// no third-party scripts, no plugins, no framing, no cross-origin form posts.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The repository holds another package at its root; pin the workspace root here.
  turbopack: { root: __dirname },
  poweredByHeader: false,
  // Security headers applied to every response.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: cspHeader },
        ],
      },
    ];
  },
};

export default nextConfig;
