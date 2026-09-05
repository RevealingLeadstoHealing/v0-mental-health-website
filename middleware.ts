import { NextResponse, type NextRequest } from "next/server";

/**
 * EHR session cookie name — must match the constant in lib/ehr/cognito-client.ts.
 * The middleware performs a lightweight presence check only; full JWT signature
 * verification happens inside each API route via requireEhrActor().
 */
const EHR_ID_COOKIE = "rlth_ehr_id";

/**
 * Routes that require an active EHR session cookie.
 * Any path starting with /ehr will redirect to /login when no cookie is present.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /ehr/* pages
  if (pathname.startsWith("/ehr")) {
    const sessionCookie = request.cookies.get(EHR_ID_COOKIE);

    if (!sessionCookie?.value) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      // Preserve the original destination so the login page can redirect back after auth
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match all /ehr routes but exclude:
   * - Next.js internals (_next/static, _next/image)
   * - The favicon
   * - All /api routes (those protect themselves via requireEhrActor)
   * - The /login page itself (would cause a redirect loop)
   */
  matcher: ["/ehr/:path*"],
};
