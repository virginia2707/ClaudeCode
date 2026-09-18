import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

// Optimistic gate: redirects to /login when no session cookie is present.
// Real verification (signature + role) happens server-side in layouts/actions.
// /games/[id]/host is intentionally NOT gated: demo hosts use a per-game cookie checked server-side.
const PROTECTED = ["/dashboard", "/quizzes", "/profile"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isTrainerGames = pathname === "/games" || pathname === "/games/new";
  const isProtected = isTrainerGames || PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/quizzes/:path*", "/games/:path*", "/profile/:path*"],
};
