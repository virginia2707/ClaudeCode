import { NextResponse, type NextRequest } from "next/server";

// Contrôle optimiste : présence du cookie de session uniquement (pas de
// vérification JWT ni d'accès base ici, conformément aux recommandations
// Next.js). L'autorisation réelle est faite côté serveur dans chaque page et
// chaque server action (requireMembership / authorizeAction).
const SESSION_COOKIE = "missionia_session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname.startsWith("/app")) {
    if (!hasSession) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if ((pathname === "/login" || pathname === "/register") && hasSession) {
    return NextResponse.redirect(new URL("/app", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/register"],
};
