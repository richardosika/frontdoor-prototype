import { noticeTestRecipient } from "@/lib/brand";
import { ensureCrmPerson } from "@/lib/crm";
import {
  deliveryTarget,
  firstName,
  isTemplateKey,
  renderTemplate,
  TEMPLATE_DEFS,
  type TemplateKey,
} from "@/lib/email-templates";
import { sendNotice } from "@/lib/notices";
import { prisma } from "@/lib/prisma";

export async function mailDeliveryMode(): Promise<"outbox" | "live"> {
  const row = await prisma.mailSettings.findUnique({ where: { id: "default" } });
  return row?.delivery === "live" ? "live" : "outbox";
}

export async function ensureTemplates() {
  for (const def of TEMPLATE_DEFS) {
    const existing = await prisma.emailTemplate.findUnique({ where: { key: def.key } });
    if (existing) continue;
    await prisma.emailTemplate.create({
      data: {
        key: def.key,
        name: def.name,
        subject: def.subject,
        body: def.body,
        versions: {
          create: { version: 1, subject: def.subject, body: def.body, savedById: "" },
        },
      },
    });
  }
  await prisma.mailSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", delivery: process.env.NOTICE_DELIVERY === "live" ? "live" : "outbox" },
  });
}

export function buildMailVars(input: {
  name: string;
  role?: string;
  org?: string;
  statusLink?: string;
  paymentLink?: string;
  loginLink?: string;
  billingLink?: string;
  applyLink?: string;
  duesAmount?: string;
  renewalDate?: string;
  note?: string;
  inviteCode?: string;
}): Record<string, string> {
  return {
    first_name: firstName(input.name),
    full_name: input.name,
    role: input.role || "",
    org: input.org || "",
    status_link: input.statusLink || "",
    payment_link: input.paymentLink || "",
    login_link: input.loginLink || "",
    billing_link: input.billingLink || "",
    apply_link: input.applyLink || "",
    dues_amount: input.duesAmount || "",
    renewal_date: input.renewalDate || "",
    note: input.note || "",
    invite_code: input.inviteCode || "",
  };
}

export async function sendTemplate(input: {
  key: TemplateKey;
  to: string;
  applicationId?: string | null;
  vars: Record<string, string>;
  person?: { name: string; role?: string; org?: string; location?: string; inviteCode?: string };
}) {
  if (!isTemplateKey(input.key)) throw new Error("Unknown template.");
  await ensureTemplates();
  if (input.person) {
    await ensureCrmPerson({
      email: input.to,
      name: input.person.name,
      role: input.person.role,
      org: input.person.org,
      location: input.person.location,
      inviteCode: input.person.inviteCode,
    });
  }
  const template = await prisma.emailTemplate.findUnique({ where: { key: input.key } });
  if (!template) throw new Error("Template missing.");
  const subject = renderTemplate(template.subject, input.vars);
  const text = renderTemplate(template.body, input.vars);
  return sendNotice({
    intendedTo: input.to,
    applicationId: input.applicationId,
    subject,
    text,
    templateKey: input.key,
  });
}

export async function sendTemplateTest(key: TemplateKey, vars: Record<string, string>) {
  await ensureTemplates();
  const template = await prisma.emailTemplate.findUnique({ where: { key } });
  if (!template) throw new Error("Template missing.");
  const mode = await mailDeliveryMode();
  const target = deliveryTarget(mode, noticeTestRecipient());
  return sendNotice({
    intendedTo: target.to,
    subject: `[test] ${renderTemplate(template.subject, vars)}`,
    text: renderTemplate(template.body, vars),
    templateKey: key,
  });
}
