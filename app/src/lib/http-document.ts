import { BRAND } from "@/lib/brand";
import { expiredLinkCopy } from "@/lib/expired-link";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** A complete HTML document. The response body is readable with JavaScript turned off. */
export function brandedDocument(input: { title: string; body: string; href: string; label: string }): string {
  const title = escapeHtml(input.title);
  const body = escapeHtml(input.body);
  const href = escapeHtml(input.href);
  const label = escapeHtml(input.label);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title} · ${escapeHtml(BRAND.name)}</title>
<style>
  body { margin: 0; background: #f4efe4; color: #1f3a2e; font-family: Georgia, "Times New Roman", serif; }
  main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
  article { width: min(28rem, 100%); background: #fbf8f1; padding: 32px 24px; }
  img { height: 40px; width: auto; background: #1f3a2e; }
  p.brand { margin: 24px 0 0; letter-spacing: 0.16em; text-transform: uppercase; font-family: "Franklin Gothic Medium", "Arial Narrow", sans-serif; font-size: 11px; font-weight: 700; color: #8a6a32; }
  h1 { margin: 4px 0 0; font-weight: 400; font-size: 2rem; }
  p.copy { margin: 12px 0 0; font-size: 0.95rem; line-height: 1.5; }
  a { display: inline-block; margin-top: 20px; color: #8a6a32; font-family: "Franklin Gothic Medium", "Arial Narrow", sans-serif; font-weight: 700; }
</style>
</head>
<body>
<main>
<article>
<img src="/brand/lockup-reversed.svg" alt="${escapeHtml(BRAND.name)}">
<p class="brand">${escapeHtml(BRAND.name)}</p>
<h1>${title}</h1>
<p class="copy">${body}</p>
<a href="${href}">${label}</a>
</article>
</main>
</body>
</html>`;
}

export function expiredDocument(kind: "payment" | "status"): string {
  const copy = expiredLinkCopy(kind);
  return brandedDocument({ title: copy.title, body: copy.body, href: "/login", label: "Sign in" });
}

export function missingPageDocument(signedIn: boolean): string {
  return brandedDocument({
    title: `That page is not on ${BRAND.name}.`,
    body: "The page you asked for is not here.",
    href: signedIn ? "/feed" : "/",
    label: signedIn ? "Back to the feed" : "Back to home",
  });
}

const APP_EXACT = new Set(["/", "/icon.svg", "/robots.txt", "/favicon.ico"]);
const APP_PREFIXES = [
  "/_next",
  "/admin",
  "/alerts",
  "/member-nda",
  "/projects",
  "/refer",
  "/viewers",
  "/api",
  "/apply",
  "/brand",
  "/confirm",
  "/deals",
  "/feed",
  "/help",
  "/invite-status",
  "/join",
  "/legal",
  "/login",
  "/members",
  "/messages",
  "/network",
  "/pay",
  "/profile",
  "/request-status",
  "/settings",
  "/suspended",
];

export function isKnownAppPath(path: string): boolean {
  if (APP_EXACT.has(path)) return true;
  return APP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
