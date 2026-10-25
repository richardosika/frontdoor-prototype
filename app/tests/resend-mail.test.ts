import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EMAIL_FROM,
  RESEND_EMAILS_URL,
  buildTestMail,
  deliverResendMail,
  emailFromAddress,
  noticeHtml,
  resendKeyConfigured,
  resendPayload,
  safeMailError,
  testMailSubject,
  type TestMail,
} from "@/lib/resend-mail";

const APPLICANT = "ada@example.com";
const TEST_INBOX = "rich@privatefloorclub.com";
const STATUS = "https://cornicio-mvp.onrender.com/invite-status/abc123";

function codeLetter(): string {
  return `Intended recipient: ${APPLICANT}\n\nYour Private Floor code is 1234.\n\nIt expires in 15 minutes.`;
}

function inviteLetter(): string {
  return `Intended recipient: ${APPLICANT}\n\nHello Ada,\n\nThank you for applying to Private Floor.\n\nCheck your status\n${STATUS}\n\nRichard Osika, Founder, Private Floor Club`;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Resend test mail", () => {
  it("addresses the test inbox and prefixes the subject", () => {
    const message = buildTestMail({
      intendedTo: APPLICANT,
      subject: "Your Private Floor code",
      text: codeLetter(),
      to: TEST_INBOX,
      from: emailFromAddress({}),
    });
    expect(message.to).toBe(TEST_INBOX);
    expect(message.to).not.toBe(APPLICANT);
    expect(message.from).toBe(DEFAULT_EMAIL_FROM);
    expect(message.from).toBe("Private Floor Club <onboarding@resend.dev>");
    expect(message.subject).toBe("[Test for ada@example.com] Your Private Floor code");
    expect(message.subject).toBe(testMailSubject(APPLICANT, "Your Private Floor code"));
    expect(message.text.startsWith(`Intended recipient: ${APPLICANT}`)).toBe(true);
    expect(message.text).toContain("1234");
    expect(message.html).toContain("letter-spacing:0.4em");
    expect(message.html).toContain(">1234<");
    expect(message.html).toContain("Private Floor Club LLC, 299 Market Street, Saddle Brook, NJ 07663");
    expect(message.html).toContain("does not offer securities or process payments through the platform");
    const payload = resendPayload(message);
    expect(payload.to).toEqual([TEST_INBOX]);
    expect(payload.html).toContain(">1234<");
    expect(resendKeyConfigured({})).toBe(false);
    expect(resendKeyConfigured({ RESEND_API_KEY: " " })).toBe(false);
    expect(resendKeyConfigured({ RESEND_API_KEY: "re_test" })).toBe(true);
  });

  it("renders a status-link button and keeps the plain-text link", () => {
    const message = buildTestMail({
      intendedTo: APPLICANT,
      subject: "Thank you for applying to Private Floor",
      text: inviteLetter(),
      to: TEST_INBOX,
      from: DEFAULT_EMAIL_FROM,
    });
    expect(message.text).toContain(STATUS);
    expect(message.html).toContain(`href="${STATUS}"`);
    expect(message.html).toContain(">CHECK YOUR STATUS</a>");
    expect(message.html).toContain("background:#1F3A2E");
    expect(message.html).toContain("background:#A8843F");
    expect(message.html).toContain("/email-assets/lockup.png");
    expect(message.html).toContain("800-399-3745");
    expect(message.html?.match(/Richard Osika, Founder, Private Floor Club/g)).toEqual([
      "Richard Osika, Founder, Private Floor Club",
    ]);
    expect(message.html).not.toContain("<script>");
    const hostile = noticeHtml(`Hello <script>alert(1)</script>\n\nCheck your status\n${STATUS}`, {
      headline: "Thank you",
    });
    expect(hostile).toContain("&lt;script&gt;");
    expect(hostile).not.toContain("<script>");
    const pay = noticeHtml("Pay here: https://cornicio-mvp.onrender.com/pay/preview", { headline: "Dues" });
    expect(pay).toContain(">PAY ANNUAL DUES</a>");
  });

  it("posts only the test recipient through a mocked fetch", async () => {
    const message: TestMail = buildTestMail({
      intendedTo: APPLICANT,
      subject: "Your Private Floor code",
      text: codeLetter(),
      to: TEST_INBOX,
      from: DEFAULT_EMAIL_FROM,
    });
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse(200, { id: "email_123" }));
    const sent = await deliverResendMail({
      message,
      apiKey: "re_test_key",
      allowedTo: TEST_INBOX,
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(sent).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(RESEND_EMAILS_URL);
    expect(init?.method).toBe("POST");
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer re_test_key");
    const body = JSON.parse(String(init?.body)) as { to: string[]; text: string; subject: string };
    expect(body.to).toEqual([TEST_INBOX]);
    expect(body.to).not.toContain(APPLICANT);
    expect(body.subject).toBe("[Test for ada@example.com] Your Private Floor code");
    expect(body.text).toContain("Intended recipient: ada@example.com");
    expect(body.text).toContain("1234");

    const refused = await deliverResendMail({
      message: { ...message, to: APPLICANT },
      apiKey: "re_test_key",
      allowedTo: TEST_INBOX,
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(refused).toEqual({ ok: false, error: "Refusing to email anyone except the test recipient." });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("records a Resend failure without throwing or keeping the key", async () => {
    const message = buildTestMail({
      intendedTo: APPLICANT,
      subject: "Thank you for applying to Private Floor",
      text: inviteLetter(),
      to: TEST_INBOX,
      from: DEFAULT_EMAIL_FROM,
    });
    const fetchImpl = vi.fn(async () =>
      jsonResponse(403, { message: "You can only send testing emails to your own email. Key re_test_key was rejected." }),
    );
    const failed = await deliverResendMail({
      message,
      apiKey: "re_test_key",
      allowedTo: TEST_INBOX,
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.error).toContain("testing emails");
      expect(failed.error).not.toContain("re_test_key");
    }
    const thrown = await deliverResendMail({
      message,
      apiKey: "re_test_key",
      allowedTo: TEST_INBOX,
      fetchImpl: (async () => {
        throw new Error("network down bearer re_test_key");
      }) as typeof fetch,
    });
    expect(thrown.ok).toBe(false);
    if (!thrown.ok) {
      expect(thrown.error).toContain("network down");
      expect(thrown.error).not.toContain("re_test_key");
    }
    expect(safeMailError(new Error("Resend send failed."))).toBe("Resend send failed.");
  });
});
