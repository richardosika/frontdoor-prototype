import { BRAND, noticeTestRecipient } from "@/lib/brand";
import { prisma } from "@/lib/prisma";

export type NoticeInput = {
  intendedTo: string;
  subject: string;
  text: string;
  applicationId?: string | null;
};

/**
 * Test outbox. The message is logged and stored for Richard.
 * Delivery, if SMTP is ever configured, still goes only to NOTICE_TEST_RECIPIENT.
 */
export async function sendNotice(input: NoticeInput): Promise<{ id: string; deliveredTo: string }> {
  const deliveredTo = noticeTestRecipient();
  const body = `Intended recipient: ${input.intendedTo}\n\n${input.text}`;
  console.log(`\n----- ${BRAND.name} outbox -----`);
  console.log(`Intended: ${input.intendedTo}`);
  console.log(`Delivered only to: ${deliveredTo}`);
  console.log(`Subject: ${input.subject}`);
  console.log(body);
  console.log("--------------------------------\n");
  const row = await prisma.outboxNotice.create({
    data: {
      intendedTo: input.intendedTo,
      deliveredTo,
      subject: input.subject,
      body,
      applicationId: input.applicationId || null,
    },
  });
  return { id: row.id, deliveredTo };
}
