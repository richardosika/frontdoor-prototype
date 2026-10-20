import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_PREFIXES = ["/login", "/apply", "/confirm", "/api/health", "/api/auth"];

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const loggedIn = Boolean(req.auth?.user);
  const isPublic = path === "/" || PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));

  if (!loggedIn && !isPublic) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (loggedIn && (path === "/" || path === "/login")) {
    return NextResponse.redirect(new URL("/feed", req.nextUrl));
  }

  if (path.startsWith("/admin") && !req.auth?.user?.isAdmin) {
    return NextResponse.redirect(new URL("/feed", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
