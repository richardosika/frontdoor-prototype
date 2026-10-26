import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextMiddleware, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { moderationDenial } from "@/lib/messaging";
import { adminEntryRedirect, loggedInPublicRedirect } from "@/lib/session-gate";
import {
  ROBOTS_TAG,
  basicAuthorizationMatches,
  siteGateChallengeHeaders,
  siteGateConfigured,
  siteGateExempt,
  skipsMemberSession,
} from "@/lib/site-gate";
import { isKnownAppPath, missingPageDocument } from "@/lib/http-document";
import { verificationDenial } from "@/lib/verification";

const { auth } = NextAuth(authConfig);

const PUBLIC_PREFIXES = ["/login", "/apply", "/confirm", "/invite-status", "/request-status", "/legal", "/brand", "/pay", "/robots.txt", "/api/health", "/api/auth", "/api/request-invite", "/api/request-to-join", "/api/stripe", "/api/help"];

function withRobots(response: NextResponse) {
  response.headers.set("X-Robots-Tag", ROBOTS_TAG);
  return response;
}

function siteGateDenied() {
  const headers = siteGateChallengeHeaders();
  return new NextResponse("Authentication required.", { status: 401, headers });
}

const withSession = auth(async (req) => {
  const path = req.nextUrl.pathname;
  const loggedIn = Boolean(req.auth?.user);
  const actor = loggedIn ? { isAdmin: Boolean(req.auth?.user?.isAdmin) } : null;
  const hiddenStatus = moderationDenial({ path, actor }) ?? verificationDenial({ path, actor });
  if (hiddenStatus) {
    return withRobots(
      new NextResponse(hiddenStatus === 404 ? "Not found" : "Forbidden", {
        status: hiddenStatus,
        headers: { "content-type": "text/plain; charset=utf-8" },
      }),
    );
  }
  if (!isKnownAppPath(path)) {
    return withRobots(
      new NextResponse(missingPageDocument(loggedIn), {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
  }
  const adminEntry = adminEntryRedirect(path, loggedIn ? { isAdmin: Boolean(req.auth?.user?.isAdmin) } : null);
  if (path === "/admin/login") {
    if (adminEntry) return withRobots(NextResponse.redirect(new URL(adminEntry, req.nextUrl)));
    return withRobots(NextResponse.next());
  }

  const isPublic = path === "/" || PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));

  if (!loggedIn && !isPublic) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("next", path);
    return withRobots(NextResponse.redirect(url));
  }

  const entry = loggedIn ? loggedInPublicRedirect(path) : null;
  if (entry) {
    return withRobots(NextResponse.redirect(new URL(entry, req.nextUrl)));
  }

  if (path.startsWith("/admin") && !req.auth?.user?.isAdmin) {
    return withRobots(NextResponse.redirect(new URL("/feed", req.nextUrl)));
  }

  return withRobots(NextResponse.next());
}) as unknown as NextMiddleware;

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const path = req.nextUrl.pathname;
  const gatePassword = process.env.SITE_GATE_PASSWORD;
  if (siteGateConfigured(gatePassword) && !siteGateExempt(path)) {
    const allowed = await basicAuthorizationMatches(req.headers.get("authorization"), gatePassword);
    if (!allowed) return siteGateDenied();
  }
  if (skipsMemberSession(path)) return withRobots(NextResponse.next());
  const response = await withSession(req, event);
  if (response) response.headers.set("X-Robots-Tag", ROBOTS_TAG);
  return response;
}

export const config = {
  matcher: ["/((?!_next/webpack-hmr).*)"],
};
