import { BRAND, noticeTestRecipient } from "@/lib/brand";
import { recordCrmEvent } from "@/lib/crm";
import { deliveryTarget } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import { buildTestMail, createSmtpTransport, deliverTestMail, emailFromAddress, safeMailError } from "@/lib/smtp-mail";

export type NoticeInput = {
  intendedTo: string;
  subject: string;
  text: string;
  applicationId?: string | null;
  templateKey?: string;
};

/**
 * Test outbox. Notices are stored for Richard and addressed only to NOTICE_TEST_RECIPIENT.
 * When SMTP_URL is set, the same notice is also emailed to that test inbox, never to the applicant.
 * A do-not-contact flag suppresses the send and keeps the reason. An SMTP failure is recorded and does not throw.
 */
export async function sendNotice(input: NoticeInput): Promise<{ id: string; deliveredTo: string; suppressed?: boolean; reason?: string }> {
  const settings = await prisma.mailSettings.findUnique({ where: { id: "default" } });
  const mode = settings?.delivery === "live" ? "live" : "outbox";
  const target = deliveryTarget(mode, noticeTestRecipient());
  const email = input.intendedTo.trim().toLowerCase();
  const person = await prisma.crmPerson.findUnique({ where: { email } });
  if (person?.doNotContact) {
    const reason = person.doNotContactReason || "Do not contact";
    const row = await prisma.outboxNotice.create({
      data: {
        intendedTo: input.intendedTo,
        deliveredTo: target.to,
        subject: input.subject,
        body: `Not sent. Do not contact: ${reason}\n\nIntended recipient: ${input.intendedTo}`,
        applicationId: input.applicationId || null,
        templateKey: input.templateKey || "",
        suppressed: true,
        suppressedReason: reason,
      },
    });
    await recordCrmEvent({
      email: person.email,
      kind: "suppressed",
      summary: `Not sent. ${reason}`,
      sourceKey: `outbox:${row.id}`,
    });
    return { id: row.id, deliveredTo: target.to, suppressed: true, reason };
  }

  const liveNote =
    mode === "live"
      ? "Delivery mode is set to live. This notice is stored in the Outbox. SMTP, when configured, emails only the test recipient.\n\n"
      : "";
  const body = `${liveNote}Intended recipient: ${input.intendedTo}\n\n${input.text}`;
  console.log(`\n----- ${BRAND.name} outbox -----`);
  console.log(`Intended: ${input.intendedTo}`);
  console.log(`Delivered only to: ${target.to}`);
  console.log(`Subject: ${input.subject}`);
  console.log(body);
  console.log("--------------------------------\n");
  const row = await prisma.outboxNotice.create({
    data: {
      intendedTo: input.intendedTo,
      deliveredTo: target.to,
      subject: input.subject,
      body,
      applicationId: input.applicationId || null,
      templateKey: input.templateKey || "",
    },
  });
  await recordCrmEvent({
    email,
    kind: "email",
    summary: `${input.templateKey || "notice"} · ${input.subject}`,
    sourceKey: `outbox:${row.id}`,
  });
  await sendStoredNoticeBySmtp(row.id, {
    intendedTo: input.intendedTo,
    subject: input.subject,
    text: body,
    to: target.to,
  });
  return { id: row.id, deliveredTo: target.to };
}

async function sendStoredNoticeBySmtp(
  id: string,
  input: { intendedTo: string; subject: string; text: string; to: string },
): Promise<void> {
  const url = process.env.SMTP_URL?.trim() ?? "";
  if (!url) return;
  const message = buildTestMail({
    intendedTo: input.intendedTo,
    subject: input.subject,
    text: input.text,
    to: input.to,
    from: emailFromAddress(),
  });
  try {
    const transport = await createSmtpTransport(url);
    const result = await deliverTestMail(message, transport, input.to);
    if (result.ok) {
      await prisma.outboxNotice.update({ where: { id }, data: { smtpStatus: "sent", smtpError: "" } });
      return;
    }
    console.error("SMTP notice failed");
    console.error(result.error);
    await prisma.outboxNotice
      .update({ where: { id }, data: { smtpStatus: "failed", smtpError: result.error } })
      .catch(() => console.error("Could not record the SMTP error on the Outbox row"));
  } catch (error) {
    const smtpError = safeMailError(error);
    console.error("SMTP notice failed");
    console.error(smtpError);
    await prisma.outboxNotice
      .update({ where: { id }, data: { smtpStatus: "failed", smtpError } })
      .catch(() => console.error("Could not record the SMTP error on the Outbox row"));
  }
}
