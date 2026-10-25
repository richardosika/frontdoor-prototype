import { brandedNoticeHtml, emailLogoUrl } from "@/lib/email-layout";

export const DEFAULT_EMAIL_FROM = "Private Floor Club <onboarding@resend.dev>";
export { emailLogoUrl };
export const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export type TestMail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type ResendPayload = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
};

export function emailFromAddress(env: { EMAIL_FROM?: string } = process.env as { EMAIL_FROM?: string }): string {
  const value = env.EMAIL_FROM?.trim();
  return value || DEFAULT_EMAIL_FROM;
}

export function resendKeyConfigured(env: { RESEND_API_KEY?: string } = process.env as { RESEND_API_KEY?: string }): boolean {
  return (env.RESEND_API_KEY ?? "").trim().length > 0;
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

/** Branded HTML for every template. The plain-text letter is unchanged. */
export function noticeHtml(text: string, options?: { headline?: string; logoUrl?: string }): string {
  return brandedNoticeHtml({
    text,
    headline: options?.headline ?? "",
    logoUrl: options?.logoUrl ?? emailLogoUrl(),
  });
}

export function buildTestMail(input: { intendedTo: string; subject: string; text: string; to: string; from: string }): TestMail {
  return {
    from: headerValue(input.from),
    to: headerValue(input.to),
    subject: testMailSubject(input.intendedTo, input.subject),
    text: input.text,
    html: noticeHtml(input.text, { headline: input.subject }),
  };
}

export function resendPayload(message: TestMail): ResendPayload {
  return {
    from: message.from,
    to: [message.to],
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
  };
}

export function safeMailError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Resend send failed.";
  const cleaned = raw
    .replace(/bearer\s+\S+/gi, "Bearer")
    .replace(/\bre_[A-Za-z0-9_]+/g, "re_")
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s/]*@/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "Resend send failed.").slice(0, 300);
}

function resendFailureText(status: number, detail: string): string {
  try {
    const parsed = JSON.parse(detail) as { message?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message.trim();
  } catch {
    // A non-JSON body is summarized below.
  }
  const compact = detail.replace(/\s+/g, " ").trim();
  return compact ? `Resend returned ${status}: ${compact}` : `Resend returned ${status}.`;
}

export async function deliverResendMail(input: {
  message: TestMail;
  apiKey: string;
  allowedTo: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const allowed = input.allowedTo.trim().toLowerCase();
  const payload = resendPayload(input.message);
  if (payload.to.length !== 1 || payload.to[0]?.trim().toLowerCase() !== allowed) {
    return { ok: false, error: "Refusing to email anyone except the test recipient." };
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) return { ok: true };
    const detail = await response.text();
    return { ok: false, error: safeMailError(new Error(resendFailureText(response.status, detail))) };
  } catch (error) {
    return { ok: false, error: safeMailError(error) };
  }
}
