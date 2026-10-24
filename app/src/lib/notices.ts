import { BRAND, noticeTestRecipient } from "@/lib/brand";
import { recordCrmEvent } from "@/lib/crm";
import { deliveryTarget } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";

export type NoticeInput = {
  intendedTo: string;
  subject: string;
  text: string;
  applicationId?: string | null;
  templateKey?: string;
};

/**
 * Test outbox. Notices are stored for Richard and addressed only to NOTICE_TEST_RECIPIENT.
 * A saved "live" delivery flag does not email the person on this build.
 * A do-not-contact flag suppresses the send and keeps the reason.
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
      ? "Delivery mode is set to live. This build still stores the notice in the Outbox for the test recipient only.\n\n"
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
  return { id: row.id, deliveredTo: target.to };
}
