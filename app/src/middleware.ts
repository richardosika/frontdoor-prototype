import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { moderationDenial } from "@/lib/messaging";
import { verificationDenial } from "@/lib/verification";

const { auth } = NextAuth(authConfig);

const PUBLIC_PREFIXES = ["/login", "/apply", "/confirm", "/invite-status", "/legal", "/api/health", "/api/auth", "/api/request-invite"];

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const loggedIn = Boolean(req.auth?.user);
  const actor = loggedIn ? { isAdmin: Boolean(req.auth?.user?.isAdmin) } : null;
  const hiddenStatus = moderationDenial({ path, actor }) ?? verificationDenial({ path, actor });
  if (hiddenStatus) {
    return new NextResponse(hiddenStatus === 404 ? "Not found" : "Forbidden", {
      status: hiddenStatus,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
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
