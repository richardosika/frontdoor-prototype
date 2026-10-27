import { after } from "next/server";
import { BRAND, noticeTestRecipient } from "@/lib/brand";
import { reviewNotice } from "@/lib/review-copy";
import { recordCrmEvent } from "@/lib/crm";
import { deliveryTarget, repairDoubledTerminalPeriod } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import { buildTestMail, deliverResendMail, emailFromAddress, safeMailError } from "@/lib/resend-mail";

export type NoticeInput = {
  intendedTo: string;
  subject: string;
  text: string;
  applicationId?: string | null;
  templateKey?: string;
};

/**
 * Test outbox. Notices are stored for Richard and addressed only to NOTICE_TEST_RECIPIENT.
 * When RESEND_API_KEY is set, the same notice is also emailed to that test inbox, never to the applicant.
 * A do-not-contact flag suppresses the send and keeps the reason. A Resend failure is recorded and does not throw.
 */
export async function sendNotice(input: NoticeInput): Promise<{ id: string; deliveredTo: string; suppressed?: boolean; reason?: string }> {
  const subject = reviewNotice(repairDoubledTerminalPeriod(input.subject));
  const text = reviewNotice(repairDoubledTerminalPeriod(input.text));
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
        subject,
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
      ? "Delivery mode is set to live. This notice is stored in the Outbox. Resend, when configured, emails only the test recipient.\n\n"
      : "";
  const body = `${liveNote}Intended recipient: ${input.intendedTo}\n\n${text}`;
  console.log(`\n----- ${BRAND.name} outbox -----`);
  console.log(`Intended: ${input.intendedTo}`);
  console.log(`Delivered only to: ${target.to}`);
  console.log(`Subject: ${subject}`);
  console.log(body);
  console.log("--------------------------------\n");
  const row = await prisma.outboxNotice.create({
    data: {
      intendedTo: input.intendedTo,
      deliveredTo: target.to,
      subject,
      body,
      applicationId: input.applicationId || null,
      templateKey: input.templateKey || "",
    },
  });
  await recordCrmEvent({
    email,
    kind: "email",
    summary: `${input.templateKey || "notice"} · ${subject}`,
    sourceKey: `outbox:${row.id}`,
  });
  const delivery = {
    intendedTo: input.intendedTo,
    subject,
    text: body,
    to: target.to,
  };
  // Resend can take several seconds. The on-screen code waits on this function, so the copy goes out after the response.
  try {
    after(() => {
      void sendStoredNotice(row.id, delivery);
    });
  } catch (error) {
    console.error("Could not defer the test email");
    console.error(error instanceof Error ? error.message : "error");
    await sendStoredNotice(row.id, delivery);
  }
  return { id: row.id, deliveredTo: target.to };
}

async function sendStoredNotice(
  id: string,
  input: { intendedTo: string; subject: string; text: string; to: string },
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  if (!apiKey) return;
  const message = buildTestMail({
    intendedTo: input.intendedTo,
    subject: input.subject,
    text: input.text,
    to: input.to,
    from: emailFromAddress(),
  });
  try {
    const result = await deliverResendMail({ message, apiKey, allowedTo: input.to });
    if (result.ok) {
      await prisma.outboxNotice.update({ where: { id }, data: { sendStatus: "sent", sendError: "" } });
      return;
    }
    console.error("Resend notice failed");
    console.error(result.error);
    await prisma.outboxNotice
      .update({ where: { id }, data: { sendStatus: "failed", sendError: result.error } })
      .catch(() => console.error("Could not record the Resend error on the Outbox row"));
  } catch (error) {
    const sendError = safeMailError(error);
    console.error("Resend notice failed");
    console.error(sendError);
    await prisma.outboxNotice
      .update({ where: { id }, data: { sendStatus: "failed", sendError } })
      .catch(() => console.error("Could not record the Resend error on the Outbox row"));
  }
}
