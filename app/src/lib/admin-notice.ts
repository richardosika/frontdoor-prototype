import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_NOTICE_COOKIE = "pf_admin_notice";

/** Short-lived notice for the page a decision returns to. The value is expiry, scope, and text. */
export function adminNoticeCookieValue(scope: string, notice: string, now = Date.now()): string {
  return `${now + 60_000}|${encodeURIComponent(scope)}|${encodeURIComponent(notice)}`;
}

export function readAdminNoticeCookie(value: string | undefined, scope: string, now = Date.now()): string | null {
  if (!value) return null;
  const [expRaw, scopeRaw, noticeRaw] = value.split("|");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < now || !scopeRaw || noticeRaw == null) return null;
  let storedScope = "";
  let notice = "";
  try {
    storedScope = decodeURIComponent(scopeRaw);
    notice = decodeURIComponent(noticeRaw).trim();
  } catch {
    return null;
  }
  if (storedScope !== scope || !notice) return null;
  return notice;
}

export async function rememberAdminNotice(scope: string, notice: string) {
  const jar = await cookies();
  jar.set(ADMIN_NOTICE_COOKIE, adminNoticeCookieValue(scope, notice), {
    path: "/admin",
    maxAge: 60,
    httpOnly: true,
    sameSite: "lax",
  });
}

/** If a decision notice was stored and this URL dropped it, put ?notice= back on the same page. */
export async function restoreAdminNotice(input: {
  scope: string;
  pathname: string;
  step?: string;
  notice?: string;
}) {
  if (input.notice) return;
  const jar = await cookies();
  const notice = readAdminNoticeCookie(jar.get(ADMIN_NOTICE_COOKIE)?.value, input.scope);
  if (!notice) return;
  const params = new URLSearchParams();
  params.set("step", input.step || "decision");
  params.set("notice", notice);
  redirect(`${input.pathname}?${params.toString()}`);
}
