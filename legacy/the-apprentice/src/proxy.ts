import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/formateur", "/apprenant", "/admin", "/play"];
const SESSION_COOKIE = "apprentice_session";

// Coarse-grained gate: redirects to /login when no session cookie is present.
// Role-specific authorization and JWT verification happen server-side in
// each page (Node.js runtime), since jsonwebtoken/Prisma aren't edge-safe.
export function proxy(request: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/formateur/:path*", "/apprenant/:path*", "/admin/:path*", "/play/:path*"],
};
