import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextMiddleware, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { moderationDenial } from "@/lib/messaging";
import { adminEntryRedirect, loggedInPublicRedirect } from "@/lib/session-gate";
import {
  GATE_COOKIE,
  GATE_COOKIE_MAX_AGE,
  GATE_FORM_PATH,
  ROBOTS_TAG,
  basicAuthorizationUser,
  gateCookieMatches,
  gateCookieValue,
  gateLocale,
  gatePageHtml,
  gatePasswordFor,
  matchGateLogin,
  parseExtraGateUsers,
  siteGateChallengeHeaders,
  siteGateConfigured,
  siteGateExempt,
  skipsMemberSession,
} from "@/lib/site-gate";
import { isKnownAppPath, missingPageDocument } from "@/lib/http-document";
import { publicAbsoluteUrl } from "@/lib/public-origin";
import { verificationDenial } from "@/lib/verification";

const { auth } = NextAuth(authConfig);

const PUBLIC_PREFIXES = ["/login", "/apply", "/join", "/confirm", "/invite-status", "/request-status", "/help", "/legal", "/brand", "/pay", "/robots.txt", "/api/health", "/api/auth", "/api/request-invite", "/api/request-to-join", "/api/stripe", "/api/help"];

function withRobots(response: NextResponse) {
  response.headers.set("X-Robots-Tag", ROBOTS_TAG);
  return response;
}

function redirectPublic(req: NextRequest, pathname: string) {
  return withRobots(NextResponse.redirect(publicAbsoluteUrl(pathname, req.headers)));
}

/** Phones get the gate as a page with a form instead of the browser pop-up (Nov 6, Julia's iPhone). */
const MOBILE_UA = /iPhone|iPad|iPod|Android.*Mobile|Mobile Safari/i;

function gateNext(req: NextRequest): string {
  const raw = req.nextUrl.searchParams.get("next") || "";
  if (req.nextUrl.pathname === GATE_FORM_PATH) return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/login";
  return `${req.nextUrl.pathname}${req.nextUrl.search}`;
}

function gatePage(req: NextRequest, input: { next: string; failed: boolean; locale?: string | null; challenge: boolean }) {
  const locale = gateLocale(input.locale || req.cookies.get("pf_lang")?.value, req.headers.get("accept-language"));
  const headers: Record<string, string> = input.challenge
    ? { ...siteGateChallengeHeaders(), "content-type": "text/html; charset=utf-8" }
    : { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "X-Robots-Tag": ROBOTS_TAG };
  return new NextResponse(gatePageHtml({ locale, next: input.next, failed: input.failed }), { status: input.challenge ? 401 : 200, headers });
}

function siteGateDenied(req: NextRequest) {
  const mobile = MOBILE_UA.test(req.headers.get("user-agent") || "");
  const accept = req.headers.get("accept") || "";
  const document = req.method === "GET" && accept.includes("text/html") && !req.headers.get("rsc") && !req.headers.get("next-action");
  if (mobile && document) return gatePage(req, { next: gateNext(req), failed: false, challenge: false });
  if (mobile) {
    return new NextResponse("Authentication required.", { status: 401, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "X-Robots-Tag": ROBOTS_TAG } });
  }
  // Desktop keeps the pop-up; Cancel shows the same page with the form.
  return gatePage(req, { next: gateNext(req), failed: false, challenge: true });
}

function withGateCookie(response: NextResponse, value: string) {
  response.cookies.set(GATE_COOKIE, value, { path: "/", maxAge: GATE_COOKIE_MAX_AGE, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
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
    if (adminEntry) return redirectPublic(req, adminEntry);
    return withRobots(NextResponse.next());
  }

  const isPublic = path === "/" || PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));

  if (!loggedIn && !isPublic) {
    const url = new URL(publicAbsoluteUrl("/login", req.headers));
    url.searchParams.set("next", path);
    return withRobots(NextResponse.redirect(url));
  }

  const entry = loggedIn ? loggedInPublicRedirect(path) : null;
  if (entry) return redirectPublic(req, entry);

  if (path.startsWith("/admin") && !req.auth?.user?.isAdmin) {
    return redirectPublic(req, "/feed");
  }

  return withRobots(NextResponse.next());
}) as unknown as NextMiddleware;

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const path = req.nextUrl.pathname;
  const gatePassword = process.env.SITE_GATE_PASSWORD;
  let newGateCookie: string | null = null;
  if (siteGateConfigured(gatePassword) && !siteGateExempt(path)) {
    const extraUsers = parseExtraGateUsers(process.env.SITE_GATE_EXTRA_USERS);
    const cookieOk = await gateCookieMatches(req.cookies.get(GATE_COOKIE)?.value, gatePassword, extraUsers);
    const basicUser = cookieOk ? null : await basicAuthorizationUser(req.headers.get("authorization"), gatePassword, extraUsers);
    if (path === GATE_FORM_PATH) {
      const lang = req.nextUrl.searchParams.get("lang");
      if (req.method === "POST") {
        const form = await req.formData().catch(() => null);
        const next = String(form?.get("next") || "/login");
        const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/login";
        const formLang = String(form?.get("lang") || "");
        const user = await matchGateLogin(String(form?.get("username") || ""), String(form?.get("password") || ""), gatePassword, extraUsers);
        const userPassword = user ? gatePasswordFor(user, gatePassword, extraUsers) : null;
        console.log(`SITE_GATE_FORM result=${user ? "ok" : "rejected"} ua=${MOBILE_UA.test(req.headers.get("user-agent") || "") ? "mobile" : "desktop"}`);
        if (!user || !userPassword) return gatePage(req, { next: safe, failed: true, locale: formLang, challenge: false });
        return withGateCookie(withRobots(NextResponse.redirect(publicAbsoluteUrl(safe, req.headers), 303)), await gateCookieValue(user, userPassword));
      }
      if (cookieOk || basicUser) return withRobots(NextResponse.redirect(publicAbsoluteUrl(gateNext(req), req.headers)));
      return gatePage(req, { next: gateNext(req), failed: false, locale: lang, challenge: false });
    }
    if (!cookieOk && !basicUser) return siteGateDenied(req);
    if (basicUser) {
      const userPassword = gatePasswordFor(basicUser, gatePassword, extraUsers);
      if (userPassword) newGateCookie = await gateCookieValue(basicUser, userPassword);
    }
  }
  if (skipsMemberSession(path)) {
    const passthrough = withRobots(NextResponse.next());
    return newGateCookie ? withGateCookie(passthrough, newGateCookie) : passthrough;
  }
  const response = await withSession(req, event);
  if (response) {
    response.headers.set("X-Robots-Tag", ROBOTS_TAG);
    if (newGateCookie) {
      const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
      response.headers.append("Set-Cookie", `${GATE_COOKIE}=${newGateCookie}; Path=/; Max-Age=${GATE_COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`);
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/webpack-hmr).*)"],
};
