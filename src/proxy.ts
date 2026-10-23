import NextAuth from "next-auth";
import { authConfig } from "@/modules/auth/auth.config";

// Optimistic redirects from the session cookie only. Real authorization happens in the data
// layer (requireWorkspace / actionScope), because proxy runs before rendering and can be bypassed
// by a matcher gap; never rely on it alone.
const { auth } = NextAuth(authConfig);

const PUBLIC_PREFIXES = ["/sign-in", "/sign-up", "/invite/"];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return;
  if (!req.auth?.user) {
    const url = new URL("/sign-in", req.nextUrl);
    url.searchParams.set("next", pathname + search);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|ico)$).*)"],
};
