import { BRAND } from "@/lib/brand";
import { resolvePublicBase } from "@/lib/url";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const FOREST = "#1F3A2E";
const CREAM = "#F4EFE4";
const PAPER = "#FFFDF8";
const BRASS = "#A8843F";
const INK = "#3B3A30";
const SERIF = "Georgia,'EB Garamond','Times New Roman',serif";

const URL_RE = /https?:\/\/[^\s<>"']+/gi;
const SIGN_RE = /^Richard Osika,\s*Founder\b/i;
const CODE_RE = /\bcode is\s+(\d{4})\b/i;

const FOOTER_LINE = `${BRAND.legalName}, ${BRAND.address} · 800-399-3745 · ${BRAND.contactEmail}`;
const FOOTER_NOTE = "Private Floor does not offer securities or process payments through the platform.";
export const RECEIPT_SUBJECT = "Private Floor payment receipt";
export const RECEIPT_FOOTER_NOTE = "Membership dues only. Private Floor does not offer securities or take investments.";

export function footerNoteFor(headline: string): string {
  return headline.trim() === RECEIPT_SUBJECT ? RECEIPT_FOOTER_NOTE : FOOTER_NOTE;
}

type Block =
  | { type: "p"; html: string }
  | { type: "button"; label: string; url: string }
  | { type: "code"; digits: string }
  | { type: "sign"; text: string };

type AssetEnv = {
  APP_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
  RENDER_EXTERNAL_URL?: string;
  AUTH_URL?: string;
  NEXTAUTH_URL?: string;
};

export function emailLogoUrl(env: AssetEnv = process.env as AssetEnv): string {
  const origin = resolvePublicBase({
    appUrl: env.APP_URL,
    nextPublicAppUrl: env.NEXT_PUBLIC_APP_URL,
    renderExternalUrl: env.RENDER_EXTERNAL_URL,
    authUrl: env.AUTH_URL,
    nextAuthUrl: env.NEXTAUTH_URL,
  }).replace(/\/$/, "");
  return `${origin}/email-assets/lockup.png`;
}

function buttonLabel(raw: string): string {
  const text = raw.replace(/&amp;/g, "&").replace(/[:.\s]+$/g, "").trim();
  const rules: [RegExp, string][] = [
    [/pay here|try again|pay membership/i, "Pay membership dues"],
    [/check your status|follow it here|see the status|status here/i, "Check your status"],
    [/decision/i, "View the decision"],
    [/reply/i, "Reply"],
    [/sign in/i, "Sign in"],
    [/billing/i, "View billing"],
    [/next step|^apply\b/i, "Apply"],
  ];
  for (const [pattern, label] of rules) {
    if (pattern.test(text)) return label;
  }
  if (text.length > 0 && text.length <= 40) return text;
  return "Continue";
}

function markerRest(rest: string): boolean {
  const text = rest.replace(/[:.\s]+$/g, "").trim();
  if (!text) return true;
  if (text.length > 60) return false;
  return (text.match(/\./g) || []).length <= 1;
}

function linkify(line: string): string {
  return line
    .split(/(https?:\/\/[^\s<>"']+)/gi)
    .map((part) => {
      if (/^https?:\/\//i.test(part)) {
        const safe = escapeHtml(part);
        return `<a href="${safe}" style="color:${FOREST};text-decoration:underline;">${safe}</a>`;
      }
      return escapeHtml(part);
    })
    .join("");
}

function blocksFromText(text: string): Block[] {
  const blocks: Block[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (SIGN_RE.test(line)) {
      blocks.push({ type: "sign", text: line });
      continue;
    }
    const code = line.match(CODE_RE);
    if (code && line.length <= 80) {
      const digits = code[1] ?? "";
      const prose = line
        .replace(new RegExp(`\\s*${digits}\\.?`), "")
        .replace(/\s{2,}/g, " ")
        .replace(/[:\s]+$/g, "")
        .trim();
      if (prose) blocks.push({ type: "p", html: escapeHtml(prose) });
      blocks.push({ type: "code", digits });
      continue;
    }
    const urls = [...line.matchAll(URL_RE)].map((match) => match[0]);
    if (urls.length === 1) {
      const url = urls[0] ?? "";
      const rest = line.replace(url, "").replace(/\s+/g, " ").trim();
      if (markerRest(rest)) {
        let label = rest;
        if (!label.replace(/[:.\s]/g, "")) {
          const previous = blocks[blocks.length - 1];
          if (previous?.type === "p" && previous.html.length <= 80 && !previous.html.includes(".")) {
            label = previous.html;
            blocks.pop();
          }
        }
        blocks.push({ type: "button", label: buttonLabel(label), url });
        continue;
      }
    }
    blocks.push({ type: "p", html: linkify(line) });
  }
  return blocks;
}

function buttonHtml(label: string, url: string): string {
  const safeUrl = escapeHtml(url);
  const safeLabel = escapeHtml(label.toUpperCase());
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
<tr><td align="center" bgcolor="${BRASS}" style="background:${BRASS};border-radius:2px;">
<a href="${safeUrl}" style="display:inline-block;padding:14px 28px;font-family:${SERIF};font-size:13px;line-height:1;letter-spacing:0.14em;color:${FOREST};text-decoration:none;">${safeLabel}</a>
</td></tr></table>`;
}

function codeHtml(digits: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
<tr><td align="center" bgcolor="${CREAM}" style="background:${CREAM};border:1px solid ${BRASS};padding:18px 28px;font-family:${SERIF};font-size:32px;line-height:1;letter-spacing:0.4em;color:${FOREST};">${escapeHtml(digits)}</td></tr></table>`;
}

function blockHtml(block: Block): string {
  if (block.type === "button") return buttonHtml(block.label, block.url);
  if (block.type === "code") return codeHtml(block.digits);
  if (block.type === "sign") {
    return `<p style="margin:20px 0 0;font-family:${SERIF};font-size:16px;line-height:1.5;color:${FOREST};">${escapeHtml(block.text)}</p>`;
  }
  return `<p style="margin:0 0 14px;font-family:${SERIF};font-size:16px;line-height:1.55;color:${INK};">${block.html}</p>`;
}

/** Table layout around an already-rendered plain-text letter. The founder line is kept once. */
export function brandedNoticeHtml(input: { text: string; headline: string; logoUrl: string }): string {
  const headline = escapeHtml(input.headline.trim() || BRAND.club).toUpperCase();
  const body = blocksFromText(input.text).map(blockHtml).join("");
  const logo = escapeHtml(input.logoUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CREAM}" style="background:${CREAM};">
<tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${PAPER};">
<tr><td align="center" bgcolor="${FOREST}" style="background:${FOREST};padding:28px 24px 22px;">
<img src="${logo}" width="240" height="41" alt="${escapeHtml(BRAND.club)}" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:240px;">
</td></tr>
<tr><td bgcolor="${BRASS}" style="background:${BRASS};height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="background:${PAPER};padding:32px 36px 12px;">
<h1 style="margin:0 0 22px;font-family:${SERIF};font-weight:normal;font-size:22px;line-height:1.35;letter-spacing:0.12em;color:${FOREST};">${headline}</h1>
${body}
</td></tr>
<tr><td bgcolor="${CREAM}" style="background:${CREAM};padding:18px 36px 28px;font-family:${SERIF};font-size:12px;line-height:1.55;color:${INK};">
${escapeHtml(FOOTER_LINE)}<br>${escapeHtml(footerNoteFor(input.headline))}
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}
