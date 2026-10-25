import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EMAIL_FROM,
  buildTestMail,
  deliverTestMail,
  emailFromAddress,
  noticeHtml,
  safeMailError,
  smtpUrlConfigured,
  testMailSubject,
  type TestMail,
} from "@/lib/smtp-mail";

const APPLICANT = "ada@example.com";
const TEST_INBOX = "rich@privatefloorclub.com";
const STATUS = "https://cornicio-mvp.onrender.com/invite-status/abc123";

function codeLetter(): string {
  return `Intended recipient: ${APPLICANT}\n\nYour Private Floor code is 1234.\n\nIt expires in 15 minutes.`;
}

function inviteLetter(): string {
  return `Intended recipient: ${APPLICANT}\n\nHello Ada,\n\nThank you for applying to Private Floor.\n\nCheck your status\n${STATUS}\n\nRichard Osika, Founder, Private Floor Club`;
}

describe("test SMTP mail", () => {
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
    expect(emailFromAddress({ EMAIL_FROM: "Private Floor Club <rich@privatefloorclub.com>" })).toBe(
      "Private Floor Club <rich@privatefloorclub.com>",
    );
    expect(message.subject).toBe(testMailSubject(APPLICANT, "Your Private Floor code"));
    expect(message.subject).toBe("[Test for ada@example.com] Your Private Floor code");
    expect(message.text.startsWith(`Intended recipient: ${APPLICANT}`)).toBe(true);
    expect(message.text).toContain("1234");
    expect(message.html).toBeUndefined();
    expect(smtpUrlConfigured({})).toBe(false);
    expect(smtpUrlConfigured({ SMTP_URL: "  " })).toBe(false);
    expect(smtpUrlConfigured({ SMTP_URL: "smtps://smtp.gmail.com:465" })).toBe(true);
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
    expect(message.html).toContain(">Check your status</a>");
    expect(message.html).not.toContain("<script>");
    const hostile = noticeHtml(`Hello <script>alert(1)</script>\n\nCheck your status\n${STATUS}`);
    expect(hostile).toContain("&lt;script&gt;");
    expect(hostile).not.toContain("<script>");
  });

  it("sends through the mocked transport and refuses any other recipient", async () => {
    const message = buildTestMail({
      intendedTo: APPLICANT,
      subject: "Your Private Floor code",
      text: codeLetter(),
      to: TEST_INBOX,
      from: DEFAULT_EMAIL_FROM,
    });
    const sendMail = vi.fn(async (_mail: TestMail) => ({ messageId: "test" }));
    const sent = await deliverTestMail(message, { sendMail }, TEST_INBOX);
    expect(sent).toEqual({ ok: true });
    expect(sendMail).toHaveBeenCalledWith(message);
    expect(sendMail.mock.calls[0]?.[0].to).toBe(TEST_INBOX);

    const refused = await deliverTestMail({ ...message, to: APPLICANT }, { sendMail }, TEST_INBOX);
    expect(refused).toEqual({ ok: false, error: "Refusing to email anyone except the test recipient." });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("records a transport failure without throwing or keeping a secret", async () => {
    const message = buildTestMail({
      intendedTo: APPLICANT,
      subject: "Your Private Floor code",
      text: codeLetter(),
      to: TEST_INBOX,
      from: DEFAULT_EMAIL_FROM,
    });
    const failed = await deliverTestMail(
      message,
      {
        sendMail: async () => {
          throw new Error("Invalid login for smtps://rich%40privatefloorclub.com:app-secret@smtp.gmail.com:465");
        },
      },
      TEST_INBOX,
    );
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.error).toContain("Invalid login");
      expect(failed.error).not.toContain("app-secret");
      expect(failed.error).not.toContain("smtps://");
    }
    expect(safeMailError(new Error("SMTP send failed."))).toBe("SMTP send failed.");
  });
});
