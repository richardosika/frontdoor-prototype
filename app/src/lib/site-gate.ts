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

/** Health, Stripe, and the public email wordmark. Everything else is behind the gate. */
export function siteGateExempt(pathname: string): boolean {
  return pathname === "/api/health" || pathname === "/api/stripe/webhook" || pathname.startsWith("/email-assets/");
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

/** Extra per-tester gate logins from SITE_GATE_EXTRA_USERS, formatted "user:pass,user:pass". Bad entries are skipped. */
export function parseExtraGateUsers(raw: string | undefined | null): Array<{ username: string; password: string }> {
  if (!raw) return [];
  const users: Array<{ username: string; password: string }> = [];
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    const split = trimmed.indexOf(":");
    if (split <= 0) continue;
    const username = trimmed.slice(0, split).trim();
    const password = trimmed.slice(split + 1);
    if (!username || !password || username === SITE_GATE_USERNAME) continue;
    users.push({ username, password });
  }
  return users;
}

/**
 * Nov 6 (Julia, iPhone): the phone's gate pop-up gives no feedback, can capitalize the first letter, and autofill can put
 * an email in the username box. Usernames compare without case or surrounding spaces, an email matches by the part
 * before @, and a password matches with or without stray spaces at the ends.
 */
export function normalizeGateUsername(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  return at > 0 ? trimmed.slice(0, at) : trimmed;
}

/** The gate login that matches, or null. Every candidate is checked so timing does not depend on which one matched. */
export async function matchGateLogin(
  username: string,
  password: string,
  expectedPassword: string,
  extraUsers: Array<{ username: string; password: string }> = [],
): Promise<string | null> {
  const candidates = [{ username: SITE_GATE_USERNAME, password: expectedPassword }, ...extraUsers];
  const user = normalizeGateUsername(username);
  let matched: string | null = null;
  for (const candidate of candidates) {
    const [usernameOk, passwordOk, trimmedOk] = await Promise.all([
      constantTimeEqual(user, normalizeGateUsername(candidate.username)),
      constantTimeEqual(password, candidate.password),
      constantTimeEqual(password.trim(), candidate.password.trim()),
    ]);
    if (usernameOk && (passwordOk || trimmedOk) && password.length > 0 && matched === null) matched = candidate.username;
  }
  return matched;
}

export async function basicAuthorizationMatches(
  header: string | null,
  expectedPassword: string,
  extraUsers: Array<{ username: string; password: string }> = [],
): Promise<boolean> {
  return (await basicAuthorizationUser(header, expectedPassword, extraUsers)) !== null;
}

export async function basicAuthorizationUser(
  header: string | null,
  expectedPassword: string,
  extraUsers: Array<{ username: string; password: string }> = [],
): Promise<string | null> {
  const parsed = parseBasicAuthorization(header);
  if (!parsed) return null;
  return matchGateLogin(parsed.username, parsed.password, expectedPassword, extraUsers);
}

/**
 * Nov 6: iPhone Safari forgets the pop-up login when Safari is closed and does not always send it with in-page
 * requests. After one good gate login the browser also gets a signed gate cookie (30 days), so later visits and
 * requests pass without the pop-up. The cookie names the gate user and is signed with that user's gate password, so
 * changing or removing a tester's gate password ends their cookie too.
 */
export const GATE_COOKIE = "pf_gate";
export const GATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const GATE_FORM_PATH = "/gate";

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", TEXT.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, TEXT.encode(message)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function gateCookieValue(username: string, password: string): Promise<string> {
  return `${encodeURIComponent(username)}.${await hmac(password, `pf-gate-v1:${username}`)}`;
}

export async function gateCookieMatches(
  value: string | undefined | null,
  expectedPassword: string,
  extraUsers: Array<{ username: string; password: string }> = [],
): Promise<boolean> {
  if (!value) return false;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return false;
  let username = "";
  try {
    username = decodeURIComponent(value.slice(0, dot));
  } catch {
    return false;
  }
  const candidates = [{ username: SITE_GATE_USERNAME, password: expectedPassword }, ...extraUsers];
  const candidate = candidates.find((item) => item.username === username);
  if (!candidate) return false;
  return constantTimeEqual(value, await gateCookieValue(candidate.username, candidate.password));
}

export function gatePasswordFor(
  username: string,
  expectedPassword: string,
  extraUsers: Array<{ username: string; password: string }> = [],
): string | null {
  if (username === SITE_GATE_USERNAME) return expectedPassword;
  return extraUsers.find((item) => item.username === username)?.password ?? null;
}

const GATE_COPY = {
  en: {
    title: "Private Floor test site",
    lead: "This test site has a tester gate before the member sign-in.",
    hint: "Use your tester gate login from the test logins email (for example username julia), not your member email. Your member email and password come on the next page.",
    user: "Gate username",
    pass: "Gate password",
    go: "Continue",
    bad: "That gate login was not recognized. Check the username and password from your test logins email.",
  },
  es: {
    title: "Sitio de prueba de Private Floor",
    lead: "Este sitio de prueba tiene un acceso para evaluadores antes del inicio de sesión de miembros.",
    hint: "Use el acceso de evaluador del correo con sus datos de prueba (por ejemplo, usuario julia), no su correo de miembro. Su correo y contraseña de miembro van en la página siguiente.",
    user: "Usuario de acceso",
    pass: "Contraseña de acceso",
    go: "Continuar",
    bad: "No se reconoció ese acceso. Revise el usuario y la contraseña del correo con sus datos de prueba.",
  },
  de: {
    title: "Private Floor Testseite",
    lead: "Diese Testseite hat vor der Mitgliederanmeldung einen Tester-Zugang.",
    hint: "Verwenden Sie den Tester-Zugang aus der E-Mail mit Ihren Testzugängen (zum Beispiel Benutzername julia), nicht Ihre Mitglieds-E-Mail. Mitglieds-E-Mail und Passwort folgen auf der nächsten Seite.",
    user: "Zugangs-Benutzername",
    pass: "Zugangs-Passwort",
    go: "Weiter",
    bad: "Dieser Zugang wurde nicht erkannt. Prüfen Sie Benutzername und Passwort aus der E-Mail mit Ihren Testzugängen.",
  },
  ja: {
    title: "Private Floor テストサイト",
    lead: "このテストサイトでは、会員ログインの前にテスター用の入口があります。",
    hint: "テスト用ログインのメールにあるテスター用ログイン（例：ユーザー名 julia）を使ってください。会員のメールアドレスではありません。会員のメールアドレスとパスワードは次のページで入力します。",
    user: "入口のユーザー名",
    pass: "入口のパスワード",
    go: "続ける",
    bad: "この入口ログインは認識されませんでした。テスト用ログインのメールにあるユーザー名とパスワードを確認してください。",
  },
} as const;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export function gateLocale(cookieValue: string | undefined | null, acceptLanguage: string | null): keyof typeof GATE_COPY {
  const pick = (v: string) => (v === "es" || v === "de" || v === "ja" || v === "en" ? v : null);
  return pick(cookieValue || "") || pick((acceptLanguage || "").slice(0, 2).toLowerCase()) || "en";
}

/** Shown when the pop-up is cancelled or the gate login fails: a real page with a form, in the visitor's language. */
export function gatePageHtml(input: { locale: keyof typeof GATE_COPY; next: string; failed: boolean }): string {
  const t = GATE_COPY[input.locale];
  const next = escapeHtml(input.next.startsWith("/") && !input.next.startsWith("//") ? input.next : "/login");
  const langs = (["en", "es", "de", "ja"] as const)
    .map((id) => `<a href="${GATE_FORM_PATH}?lang=${id}&amp;next=${encodeURIComponent(input.next)}" lang="${id}" style="padding:8px 10px;border:1px solid #c9b27c;border-radius:3px;color:#1f3a2e;text-decoration:none;${id === input.locale ? "background:#1f3a2e;color:#fff;" : ""}">${{ en: "English", es: "Español", de: "Deutsch", ja: "日本語" }[id]}</a>`)
    .join(" ");
  return `<!doctype html><html lang="${input.locale}" translate="no"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(t.title)}</title></head>
<body style="margin:0;background:#f4efe4;font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#1f3a2e">
<main style="max-width:420px;margin:0 auto;background:#fffdf8;min-height:100vh;box-sizing:border-box">
<div style="background:#1f3a2e;color:#fffdf8;padding:18px 24px;font-family:Georgia,serif;font-size:20px">Private Floor</div>
<div style="padding:24px">
<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px;font-size:14px">${langs}</div>
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 8px">${escapeHtml(t.title)}</h1>
<p style="font-size:15px;margin:0 0 8px">${escapeHtml(t.lead)}</p>
<p style="font-size:14px;color:#555;margin:0 0 16px">${escapeHtml(t.hint)}</p>
${input.failed ? `<p role="alert" data-testid="gate-error" style="font-size:14px;color:#8a5a12;background:#f6ecd6;padding:10px;border-radius:3px">${escapeHtml(t.bad)}</p>` : ""}
<form method="post" action="${GATE_FORM_PATH}" data-testid="gate-form">
<input type="hidden" name="next" value="${next}">
<input type="hidden" name="lang" value="${input.locale}">
<label style="display:block;font-size:13px;font-weight:600;margin:12px 0 4px" for="gu">${escapeHtml(t.user)}</label>
<input id="gu" name="username" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" required style="width:100%;box-sizing:border-box;font-size:16px;padding:12px;border:1px solid #c8c2b4;border-radius:3px">
<label style="display:block;font-size:13px;font-weight:600;margin:12px 0 4px" for="gp">${escapeHtml(t.pass)}</label>
<input id="gp" name="password" type="password" autocomplete="off" required style="width:100%;box-sizing:border-box;font-size:16px;padding:12px;border:1px solid #c8c2b4;border-radius:3px">
<button type="submit" style="margin-top:18px;width:100%;min-height:46px;font-size:16px;font-weight:600;background:#1f3a2e;color:#fffdf8;border:0;border-radius:3px">${escapeHtml(t.go)}</button>
</form></div></main></body></html>`;
}

export function siteGateChallengeHeaders(): Record<string, string> {
  return {
    "WWW-Authenticate": 'Basic realm="Private Floor tester gate (use your tester gate login, not your member email; member sign-in comes next)", charset="UTF-8"',
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "X-Robots-Tag": ROBOTS_TAG,
  };
}
