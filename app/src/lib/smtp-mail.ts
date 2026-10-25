export const DEFAULT_EMAIL_FROM = "Private Floor Club <rich@privatefloorclub.com>";

const STATUS_URL = /https?:\/\/[^\s<>"']+\/(?:invite-status|apply\/status)\/[^\s<>"']+/gi;

export type TestMail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type MailTransport = {
  sendMail: (message: TestMail) => Promise<unknown>;
};

export function emailFromAddress(env: { EMAIL_FROM?: string } = process.env as { EMAIL_FROM?: string }): string {
  const value = env.EMAIL_FROM?.trim();
  return value || DEFAULT_EMAIL_FROM;
}

export function smtpUrlConfigured(env: { SMTP_URL?: string } = process.env as { SMTP_URL?: string }): boolean {
  return (env.SMTP_URL ?? "").trim().length > 0;
}

function headerValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function testMailSubject(intendedTo: string, subject: string): string {
  return `[Test for ${headerValue(intendedTo)}] ${headerValue(subject)}`;
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function statusButton(url: string): string {
  return `<p style="margin:16px 0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#1F3A2E;color:#FFFDF8;padding:12px 18px;text-decoration:none;">Check your status</a></p>`;
}

/** HTML part only when the letter contains an invite or application status link. */
export function noticeHtml(text: string): string | null {
  const urls = [...text.matchAll(STATUS_URL)].map((match) => match[0]);
  if (!urls.length) return null;
  const urlSet = new Set(urls);
  const lines = text.split("\n");
  const parts: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    const next = (lines[index + 1] ?? "").trim();
    if (trimmed === "Check your status" && urlSet.has(next)) continue;
    if (urlSet.has(trimmed)) {
      parts.push(statusButton(trimmed));
      continue;
    }
    if (!trimmed) continue;
    const found = [...urlSet].filter((url) => line.includes(url));
    if (!found.length) {
      parts.push(`<p style="margin:0 0 12px;">${escapeHtml(line)}</p>`);
      continue;
    }
    let remaining = line;
    for (const url of found) remaining = remaining.replace(url, "");
    const prose = remaining.replace(/\s+/g, " ").trim();
    if (prose) parts.push(`<p style="margin:0 0 12px;">${escapeHtml(prose)}</p>`);
    for (const url of found) parts.push(statusButton(url));
  }
  return `<div style="font-family:Georgia,serif;color:#1F3A2E;">${parts.join("")}</div>`;
}

export function buildTestMail(input: { intendedTo: string; subject: string; text: string; to: string; from: string }): TestMail {
  const html = noticeHtml(input.text);
  return {
    from: headerValue(input.from),
    to: headerValue(input.to),
    subject: testMailSubject(input.intendedTo, input.subject),
    text: input.text,
    ...(html ? { html } : {}),
  };
}

export function safeMailError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "SMTP send failed.";
  const cleaned = raw
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s/]*@/gi, "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}:[^\s]+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "SMTP send failed.").slice(0, 300);
}

export async function deliverTestMail(
  message: TestMail,
  transport: MailTransport,
  allowedTo: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (message.to.trim().toLowerCase() !== allowedTo.trim().toLowerCase()) {
    return { ok: false, error: "Refusing to email anyone except the test recipient." };
  }
  try {
    await transport.sendMail(message);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: safeMailError(error) };
  }
}

export async function createSmtpTransport(url: string): Promise<MailTransport> {
  const nodemailer = await import("nodemailer");
  return nodemailer.createTransport(url);
}
