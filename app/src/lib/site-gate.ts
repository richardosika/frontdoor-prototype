export const SITE_GATE_USERNAME = "privatefloor";
export const ROBOTS_TAG = "noindex, nofollow";

const TEXT = new TextEncoder();

/** SHA-256 then a fixed-length XOR. The loop never stops early, and both digests are 32 bytes. */
export async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([digest(left), digest(right)]);
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

async function digest(value: string): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", TEXT.encode(value));
  return new Uint8Array(hash);
}

export function siteGateConfigured(password: string | undefined | null): password is string {
  return typeof password === "string" && password.length > 0;
}

/** Render's health check and the Stripe webhook. Everything else is behind the gate. */
export function siteGateExempt(pathname: string): boolean {
  return pathname === "/api/health" || pathname === "/api/stripe/webhook";
}

/** Paths the member session gate used to ignore. The site gate still applies to them. */
export function skipsMemberSession(pathname: string): boolean {
  if (pathname.startsWith("/_next/static") || pathname.startsWith("/_next/image")) return true;
  if (pathname === "/favicon.ico" || pathname === "/icon.svg" || pathname.startsWith("/brand/")) return true;
  return /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i.test(pathname);
}

export function parseBasicAuthorization(header: string | null): { username: string; password: string } | null {
  if (!header) return null;
  const match = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(header.trim());
  if (!match) return null;
  try {
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(match[1]), (char) => char.charCodeAt(0)));
    const split = decoded.indexOf(":");
    if (split < 0) return null;
    return { username: decoded.slice(0, split), password: decoded.slice(split + 1) };
  } catch {
    return null;
  }
}

export async function basicAuthorizationMatches(header: string | null, expectedPassword: string): Promise<boolean> {
  const parsed = parseBasicAuthorization(header);
  const [usernameOk, passwordOk] = await Promise.all([
    constantTimeEqual(parsed?.username ?? "", SITE_GATE_USERNAME),
    constantTimeEqual(parsed?.password ?? "", expectedPassword),
  ]);
  return usernameOk && passwordOk;
}

export function siteGateChallengeHeaders(): Record<string, string> {
  return {
    "WWW-Authenticate": 'Basic realm="Private Floor", charset="UTF-8"',
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "X-Robots-Tag": ROBOTS_TAG,
  };
}
