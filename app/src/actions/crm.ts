"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeAdminBack } from "@/lib/admin-home";
import { requireAdmin } from "@/lib/current-user";
import { ensureCrmPerson, recordCrmEvent } from "@/lib/crm";
import { deleteJoinRequest } from "@/lib/delete-join-request";
import { crmStage, isDecisionStage, stageOverride } from "@/lib/crm-stage";
import { isTemplateKey, sampleTemplateVars } from "@/lib/email-templates";
import { buildMailVars, ensureTemplates, sendTemplate, sendTemplateTest } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { isRoleId, roleLabel } from "@/lib/roles";
import { appBaseUrl } from "@/lib/url";

function mintInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chunk = (size: number) => Array.from(randomBytes(size), (byte) => alphabet[byte % alphabet.length]).join("");
  return `PF-${chunk(4)}-${chunk(4)}`;
}

export async function saveTemplate(formData: FormData) {
  const admin = await requireAdmin();
  const key = String(formData.get("key") || "");
  const subject = String(formData.get("subject") || "").trim().slice(0, 200);
  const body = String(formData.get("body") || "").trim().slice(0, 8000);
  if (!isTemplateKey(key) || subject.length < 2 || body.length < 2) {
    redirect(`/admin/templates/${key}?error=Subject+and+body+are+required`);
  }
  await ensureTemplates();
  const template = await prisma.emailTemplate.findUnique({ where: { key }, include: { versions: true } });
  if (!template) redirect("/admin/templates?error=Unknown+template");
  const version = template.versions.reduce((max, row) => Math.max(max, row.version), 0) + 1;
  await prisma.emailTemplate.update({
    where: { id: template.id },
    data: {
      subject,
      body,
      versions: { create: { version, subject, body, savedById: admin.id } },
    },
  });
  revalidatePath(`/admin/templates/${key}`);
  redirect(`/admin/templates/${key}?notice=Saved+version+${version}`);
}

export async function restoreTemplate(formData: FormData) {
  const admin = await requireAdmin();
  const versionId = String(formData.get("versionId") || "");
  const version = await prisma.emailTemplateVersion.findUnique({ where: { id: versionId }, include: { template: true } });
  if (!version) redirect("/admin/templates");
  const next = (await prisma.emailTemplateVersion.count({ where: { templateId: version.templateId } })) + 1;
  await prisma.emailTemplate.update({
    where: { id: version.templateId },
    data: {
      subject: version.subject,
      body: version.body,
      versions: { create: { version: next, subject: version.subject, body: version.body, savedById: admin.id } },
    },
  });
  revalidatePath(`/admin/templates/${version.template.key}`);
  redirect(`/admin/templates/${version.template.key}?notice=Restored+as+version+${next}`);
}

export async function sendTestTemplate(formData: FormData) {
  await requireAdmin();
  const key = String(formData.get("key") || "");
  if (!isTemplateKey(key)) redirect("/admin/templates");
  await sendTemplateTest(key, sampleTemplateVars());
  revalidatePath("/admin/outbox");
  redirect(`/admin/templates/${key}?notice=Test+is+in+the+Outbox`);
}

export async function setDeliveryMode(formData: FormData) {
  const admin = await requireAdmin();
  const delivery = String(formData.get("delivery") || "") === "live" ? "live" : "outbox";
  await prisma.mailSettings.upsert({
    where: { id: "default" },
    update: { delivery },
    create: { id: "default", delivery },
  });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "MAIL_DELIVERY",
      summary: `${admin.name} set mail delivery to ${delivery}. This build still uses the Outbox.`,
    },
  });
  const back = safeAdminBack(String(formData.get("back") || ""), "/admin/templates");
  revalidatePath("/admin/templates");
  revalidatePath("/admin/settings");
  redirect(`${back}?notice=Delivery+flag+saved.+Notices+still+go+to+the+Outbox.`);
}

export async function saveCrmPerson(formData: FormData) {
  const admin = await requireAdmin();
  const personId = String(formData.get("personId") || "");
  const person = await prisma.crmPerson.findUnique({
    where: { id: personId },
    include: {
      application: { select: { status: true } },
      inviteRequest: { select: { status: true } },
      user: { select: { status: true, paymentStatus: true } },
    },
  });
  if (!person) redirect("/admin/crm");
  const tags = String(formData.get("tags") || "").trim().slice(0, 240);
  const followUpNote = String(formData.get("followUpNote") || "").trim().slice(0, 500);
  const followUpRaw = String(formData.get("followUpAt") || "");
  const followUpAt = /^\d{4}-\d{2}-\d{2}$/.test(followUpRaw) ? new Date(`${followUpRaw}T23:59:59.000Z`) : null;
  const ownerId = String(formData.get("ownerId") || "");
  const owner = ownerId ? await prisma.user.findFirst({ where: { id: ownerId, isAdmin: true }, select: { id: true } }) : null;
  const doNotContact = formData.get("doNotContact") === "yes";
  const doNotContactReason = String(formData.get("doNotContactReason") || "").trim().slice(0, 500);
  if (doNotContact && doNotContactReason.length < 3) {
    redirect(`/admin/crm/${person.id}?error=Write+why+this+person+should+not+be+contacted`);
  }
  const manualRaw = String(formData.get("manualStage") || "");
  if (isDecisionStage(manualRaw)) {
    await prisma.moderationEvent.create({
      data: {
        actorId: admin.id,
        action: "STAGE_OVERRIDE_REFUSED",
        summary: `${admin.name} tried to set ${person.name} to ${manualRaw} from the CRM stage menu. Approve, Active, and Declined stay on the guided review.`,
      },
    });
    revalidatePath("/admin/audit");
    redirect(`/admin/crm/${person.id}?error=${encodeURIComponent("Stage override cannot approve, activate, or decline. Use the guided review decision.")}`);
  }
  const manualStage = stageOverride(manualRaw);
  const stage = crmStage({
    inviteStatus: person.inviteRequest?.status,
    applicationStatus: person.application?.status,
    memberActive: person.user?.status === "ACTIVE",
    paymentStatus: person.user?.paymentStatus,
    manualStage,
  });
  await prisma.crmPerson.update({
    where: { id: person.id },
    data: {
      tags,
      followUpNote,
      followUpAt,
      ownerId: owner?.id || null,
      doNotContact,
      doNotContactReason: doNotContact ? doNotContactReason : "",
      manualStage,
      stage,
    },
  });
  if (followUpRaw !== (person.followUpAt ? person.followUpAt.toISOString().slice(0, 10) : "")) {
    await recordCrmEvent({
      email: person.email,
      kind: "follow_up",
      summary: followUpAt ? `${admin.name} set a follow-up for ${followUpRaw}. ${followUpNote}` : `${admin.name} cleared the follow-up.`,
    });
  }
  revalidatePath("/admin/crm");
  revalidatePath(`/admin/crm/${person.id}`);
  redirect(`/admin/crm/${person.id}?notice=Saved`);
}

export async function addCrmNote(formData: FormData) {
  const admin = await requireAdmin();
  const personId = String(formData.get("personId") || "");
  const body = String(formData.get("body") || "").trim().slice(0, 2000);
  if (body.length < 2) redirect(`/admin/crm/${personId}?error=Write+a+note`);
  const person = await prisma.crmPerson.findUnique({ where: { id: personId } });
  if (!person) redirect("/admin/crm");
  await prisma.crmNote.create({ data: { personId: person.id, authorId: admin.id, body } });
  await recordCrmEvent({ email: person.email, kind: "note", summary: body });
  revalidatePath(`/admin/crm/${person.id}`);
  redirect(`/admin/crm/${person.id}?notice=Note+added`);
}

export async function sendPersonInfo(formData: FormData) {
  await requireAdmin();
  const personId = String(formData.get("personId") || "");
  const person = await prisma.crmPerson.findUnique({ where: { id: personId } });
  if (!person) redirect("/admin/crm");
  const base = await appBaseUrl();
  await sendTemplate({
    key: "info",
    to: person.email,
    vars: buildMailVars({
      name: person.name,
      role: person.role ? roleLabel(person.role) : "",
      org: person.org,
      applyLink: `${base}/apply`,
      inviteCode: person.inviteCode,
    }),
    person: { name: person.name, role: person.role, org: person.org, location: person.location, inviteCode: person.inviteCode },
  });
  revalidatePath("/admin/outbox");
  redirect(`/admin/crm/${person.id}?notice=Information+email+is+in+the+Outbox`);
}

export async function addProspect(formData: FormData) {
  const admin = await requireAdmin();
  const name = String(formData.get("name") || "").trim().slice(0, 120);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "");
  const org = String(formData.get("org") || "").trim().slice(0, 160);
  const location = String(formData.get("location") || "").trim().slice(0, 120);
  const send = formData.get("sendInfo") === "yes";
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/admin/crm?error=Name+and+a+valid+email+are+required");
  }
  if (role && !isRoleId(role)) redirect("/admin/crm?error=Unknown+role");
  let code = mintInviteCode();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.inviteCode.create({
        data: { code, maxUses: 1, note: `For ${name}`, createdById: admin.id },
      });
      break;
    } catch {
      code = mintInviteCode();
      if (attempt === 2) redirect("/admin/crm?error=Could+not+mint+an+invite+code");
    }
  }
  const person = await ensureCrmPerson({
    email,
    name,
    role,
    org,
    location,
    inviteCode: code,
    ownerId: admin.id,
  });
  await recordCrmEvent({
    email,
    kind: "invited",
    summary: `${admin.name} added ${name} and minted ${code}.`,
    sourceKey: `prospect:${person.id}:${code}`,
  });
  if (send) {
    const base = await appBaseUrl();
    await sendTemplate({
      key: "info",
      to: email,
      vars: buildMailVars({
        name,
        role: role ? roleLabel(role) : "",
        org,
        applyLink: `${base}/apply`,
        inviteCode: code,
      }),
      person: { name, role, org, location, inviteCode: code },
    });
  }
  revalidatePath("/admin/crm");
  revalidatePath("/admin/outbox");
  redirect(`/admin/crm/${person.id}?notice=${encodeURIComponent(send ? `Prospect added. Code ${code}. Information email is in the Outbox.` : `Prospect added. Code ${code}.`)}`);
}

export async function deleteCrmPerson(formData: FormData) {
  const admin = await requireAdmin();
  const personId = String(formData.get("personId") || "");
  const person = await prisma.crmPerson.findUnique({ where: { id: personId } });
  if (!person) redirect("/admin/crm?error=That+person+was+not+found");
  const requestOnly = !person.applicationId && !person.userId;
  const request = requestOnly
    ? person.inviteRequestId
      ? await prisma.inviteRequest.findUnique({ where: { id: person.inviteRequestId } })
      : await prisma.inviteRequest.findFirst({ where: { email: person.email }, orderBy: { createdAt: "desc" } })
    : null;
  if (request) {
    await deleteJoinRequest(request);
    await prisma.moderationEvent.create({
      data: {
        actorId: admin.id,
        action: "DELETE_CRM_PERSON",
        summary: `${admin.name} deleted the CRM person ${person.name} <${person.email}> and the linked request to join.`,
      },
    });
    revalidatePath("/admin/crm");
    revalidatePath("/admin");
    revalidatePath("/admin/verification");
    redirect("/admin/crm?notice=CRM+person+deleted.+The+linked+request+to+join+was+deleted+too.");
  }
  await prisma.crmPerson.delete({ where: { id: person.id } });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "DELETE_CRM_PERSON",
      summary: `${admin.name} deleted the CRM person ${person.name} <${person.email}>. The member account and application were left in place.`,
    },
  });
  revalidatePath("/admin/crm");
  redirect("/admin/crm?notice=CRM+person+deleted.+The+member+account+and+application+were+left+in+place.");
}
