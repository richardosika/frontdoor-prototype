import { sendNotice } from "@/lib/notices";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Every notice on this test build is logged and stored in the admin Outbox.
 * Resend, when configured, delivers only to NOTICE_TEST_RECIPIENT. Applicants are never emailed.
 */
export async function sendEmail(message: EmailMessage): Promise<{ delivered: "outbox"; id: string }> {
  const result = await sendNotice({
    intendedTo: message.to,
    subject: message.subject,
    text: message.text,
  });
  return { delivered: "outbox", id: result.id };
}
