"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireVerificationAdmin } from "@/lib/current-user";
import { issueInviteCodeForRequest } from "@/lib/invite-issue";
import {
  applyDecisionStatus,
  assertChecklistAllowsVerified,
  ensureVerificationCase,
  parseCheckResult,
  writeStatusEvent,
} from "@/lib/verification-db";
import { confirmedNote, isAutoSuggestedNote } from "@/lib/guided-prefill";
import { prepareGuidedCase, runLivePrefill } from "@/lib/guided-prefill-db";
import { rerunChecksHref } from "@/lib/rerun-checks";
import { checkResultLabel, isVerificationStatus, verificationStatusLabel } from "@/lib/verification";

export async function updateVerificationCase(formData: FormData) {
  const admin = await requireVerificationAdmin();
  const caseId = String(formData.get("caseId") || "");
  const status = String(formData.get("status") || "");
  const internalNote = String(formData.get("internalNote") || "").trim().slice(0, 4000);
  const expiresRaw = String(formData.get("expiresAt") || "").trim();
  const back = `/admin/verification/${caseId}`;
  if (!isVerificationStatus(status)) redirect(`${back}?error=Unknown+status`);

  const existing = await prisma.verificationCase.findUnique({ where: { id: caseId } });
  if (!existing) notFound();
  if (existing.subject === "MEMBER" && status !== existing.status) {
    redirect(`${back}?error=${encodeURIComponent("File status follows the decision on step 8. Use Approve, Request more info, or Decline.")}`);
  }

  const allowed = await assertChecklistAllowsVerified(caseId, status);
  if (!allowed.ok) redirect(`${back}?error=${encodeURIComponent(allowed.reason)}`);

  let expiresAt: Date | null = null;
  if (expiresRaw) {
    const parsed = new Date(`${expiresRaw}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) redirect(`${back}?error=Enter+a+valid+re-verify+date`);
    expiresAt = parsed;
  }

  const verifiedAt = status === "VERIFIED" ? existing.verifiedAt ?? new Date() : existing.verifiedAt;
  await prisma.verificationCase.update({
    where: { id: caseId },
    data: { status, internalNote, expiresAt, verifiedAt },
  });
  await writeStatusEvent({
    caseId,
    actorId: admin.id,
    actorName: admin.name,
    fromStatus: existing.status,
    toStatus: status,
  });
  if (internalNote !== existing.internalNote) {
    await prisma.verificationEvent.create({
      data: {
        caseId,
        actorId: admin.id,
        fromStatus: status,
        toStatus: status,
        summary: `${admin.name} updated the internal note.`,
      },
    });
  }

  revalidatePath("/admin/verification");
  revalidatePath(back);
  revalidatePath("/admin");
  revalidatePath("/profile");
  if (existing.userId) revalidatePath(`/members/${existing.userId}`);
  redirect(`${back}?notice=${encodeURIComponent(`Status is ${verificationStatusLabel(status)}.`)}`);
}

export async function updateVerificationCheck(formData: FormData) {
  const admin = await requireVerificationAdmin();
  const checkId = String(formData.get("checkId") || "");
  const result = parseCheckResult(String(formData.get("result") || ""));
  const note = String(formData.get("note") || "").trim().slice(0, 2000);
  const evidenceUrl = String(formData.get("evidenceUrl") || "").trim().slice(0, 500);
  const check = await prisma.verificationCheck.findUnique({ where: { id: checkId } });
  if (!check) notFound();
  const back = `/admin/verification/${check.caseId}`;
  if (!result) redirect(`${back}?error=Unknown+result`);
  if (evidenceUrl && !/^https?:\/\//i.test(evidenceUrl)) {
    redirect(`${back}?error=Evidence+links+must+start+with+http`);
  }
  if (result === "PASS" && !/^https?:\/\//i.test(evidenceUrl)) {
    redirect(`${back}?error=${encodeURIComponent("A pass needs an evidence link. Couldn't verify is not a pass.")}`);
  }

  const record = await prisma.verificationCase.findUnique({ where: { id: check.caseId } });
  if (!record) notFound();
  const savedNote = confirmedNote(note).slice(0, 2000);
  const wasSuggested = check.autoSuggested || isAutoSuggestedNote(check.note);
  await prisma.verificationCheck.update({
    where: { id: check.id },
    data: {
      result,
      note: savedNote,
      evidenceUrl,
      autoSuggested: false,
      reviewerId: admin.id,
      reviewedAt: new Date(),
    },
  });
  await prisma.verificationEvent.create({
    data: {
      caseId: check.caseId,
      actorId: admin.id,
      fromStatus: record.status,
      toStatus: record.status,
      summary: wasSuggested
        ? `${admin.name} confirmed “${check.label}” as ${checkResultLabel(result)}.`
        : `${admin.name} set “${check.label}” to ${checkResultLabel(result)}.`,
    },
  });

  revalidatePath(back);
  revalidatePath("/admin/verification");
  const nextStep = String(formData.get("nextStep") || "");
  const stepQuery = /^\d+$/.test(nextStep) ? `&step=${nextStep}` : "";
  redirect(`${back}?notice=Checklist+saved${stepQuery}`);
}

export async function skipVerificationCheck(formData: FormData) {
  const admin = await requireVerificationAdmin();
  const checkId = String(formData.get("checkId") || "");
  const reason = String(formData.get("skipReason") || "").trim().slice(0, 500);
  const check = await prisma.verificationCheck.findUnique({ where: { id: checkId } });
  if (!check) notFound();
  const back = `/admin/verification/${check.caseId}`;
  if (reason.length < 8) redirect(`${back}?error=${encodeURIComponent("A skip needs a short reason (at least 8 characters).")}`);
  const record = await prisma.verificationCase.findUnique({ where: { id: check.caseId } });
  if (!record) notFound();
  const note = `Skipped: ${reason}`.slice(0, 2000);
  await prisma.verificationCheck.update({
    where: { id: check.id },
    data: { result: "NOT_PROVIDED", note, autoSuggested: false, reviewerId: admin.id, reviewedAt: new Date() },
  });
  await prisma.verificationEvent.create({
    data: {
      caseId: check.caseId,
      actorId: admin.id,
      fromStatus: record.status,
      toStatus: record.status,
      summary: `${admin.name} skipped “${check.label}” (not a pass). Reason: ${reason}`,
    },
  });
  revalidatePath(back);
  const nextStep = String(formData.get("nextStep") || "");
  const stepQuery = /^\d+$/.test(nextStep) ? `&step=${nextStep}` : "";
  redirect(`${back}?notice=${encodeURIComponent("Skip recorded. It is not a pass.")}${stepQuery}`);
}

export async function deleteBusinessCard(formData: FormData) {
  const admin = await requireVerificationAdmin();
  const caseId = String(formData.get("caseId") || "");
  const back = `/admin/verification/${caseId}`;
  const record = await prisma.verificationCase.findUnique({ where: { id: caseId } });
  if (!record) notFound();
  if (record.status !== "VERIFIED" || !record.userId) {
    redirect(`${back}?error=${encodeURIComponent("Delete the business card after the member file is marked Verified.")}`);
  }
  const card = await prisma.businessCard.findUnique({ where: { userId: record.userId } });
  if (!card || card.deletedAt) redirect(`${back}?error=${encodeURIComponent("No business card is on file.")}`);

  await prisma.businessCard.update({
    where: { id: card.id },
    data: {
      bytes: Buffer.alloc(0),
      sizeBytes: 0,
      deletedAt: new Date(),
      deletedById: admin.id,
    },
  });
  await prisma.verificationEvent.create({
    data: {
      caseId: record.id,
      actorId: admin.id,
      fromStatus: record.status,
      toStatus: record.status,
      summary: `${admin.name} deleted the business card after verification.`,
    },
  });
  revalidatePath(back);
  redirect(`${back}?notice=${encodeURIComponent("Business card deleted.")}`);
}

export async function startGuidedReview(formData: FormData) {
  await requireVerificationAdmin();
  const applicationId = String(formData.get("applicationId") || "");
  const inviteRequestId = String(formData.get("inviteRequestId") || "");
  const personId = String(formData.get("personId") || "");
  const userIdRaw = String(formData.get("userId") || "");
  const person = personId
    ? await prisma.crmPerson.findUnique({
        where: { id: personId },
        select: { userId: true, applicationId: true, inviteRequestId: true },
      })
    : null;
  const application = applicationId
    ? await prisma.application.findUnique({ where: { id: applicationId }, select: { id: true, userId: true } })
    : null;
  let userId = userIdRaw || application?.userId || person?.userId || "";
  const appId = application?.id || person?.applicationId || "";
  const inviteId = inviteRequestId || person?.inviteRequestId || "";
  if (!userId && inviteId) {
    const invite = await prisma.inviteRequest.findUnique({ where: { id: inviteId }, select: { email: true } });
    const member = invite ? await prisma.user.findUnique({ where: { email: invite.email }, select: { id: true } }) : null;
    if (member) userId = member.id;
  }
  if (!userId && !appId && !inviteId) {
    const back = personId ? `/admin/crm/${personId}` : "/admin/applications";
    redirect(`${back}?error=${encodeURIComponent("This person has no application to review yet.")}`);
  }
  const record = await ensureVerificationCase({
    subject: "MEMBER",
    userId: userId || undefined,
    applicationId: appId || undefined,
    inviteRequestId: inviteId || undefined,
  });
  await prepareGuidedCase(record.id);
  revalidatePath(`/admin/verification/${record.id}`);
  revalidatePath("/admin/verification");
  redirect(`/admin/verification/${record.id}?step=identity`);
}

export async function rerunGuidedChecks(formData: FormData) {
  await requireVerificationAdmin();
  const caseId = String(formData.get("caseId") || "");
  const back = `/admin/verification/${caseId}`;
  try {
    const existing = caseId ? await prisma.verificationCase.findUnique({ where: { id: caseId }, select: { id: true } }) : null;
    if (!existing) redirect(rerunChecksHref(caseId, "missing"));
    await runLivePrefill(caseId);
    revalidatePath(back);
    revalidatePath("/admin/verification");
  } catch (error) {
    unstable_rethrow(error);
    console.error("re-run checks failed", caseId, error instanceof Error ? error.message : "error");
    redirect(rerunChecksHref(caseId, "failed"));
  }
  redirect(rerunChecksHref(caseId, "done"));
}

export async function decideInviteReview(formData: FormData) {
  const admin = await requireVerificationAdmin();
  const caseId = String(formData.get("caseId") || "");
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 500);
  const back = `/admin/verification/${caseId}?step=decision`;
  if (decision !== "APPROVED" && decision !== "DECLINED" && decision !== "NEEDS_INFO") {
    redirect(`${back}&error=${encodeURIComponent("Choose Approve, Request more info, or Decline.")}`);
  }
  const record = await prisma.verificationCase.findUnique({
    where: { id: caseId },
    include: { inviteRequest: true },
  });
  if (!record?.inviteRequest) redirect(`${back}&error=${encodeURIComponent("This file has no request to join.")}`);
  if (record.inviteRequest.status !== "PENDING") {
    redirect(`${back}&error=${encodeURIComponent("That request to join is not waiting.")}`);
  }
  if (decision === "NEEDS_INFO" && note.length < 2) {
    redirect(`${back}&error=${encodeURIComponent("Write what you need from the applicant.")}`);
  }
  if (decision === "APPROVED") {
    const issued = await issueInviteCodeForRequest({ adminId: admin.id, requestId: record.inviteRequest.id });
    if (!issued.ok) redirect(`${back}&error=${encodeURIComponent(issued.error)}`);
    await applyDecisionStatus({ caseId: record.id, decision, actorId: admin.id, actorName: admin.name });
    revalidatePath(back);
    revalidatePath("/admin");
    revalidatePath("/admin/applications");
    revalidatePath("/admin/verification");
    redirect(`${back}&notice=${encodeURIComponent(`Invite code issued for ${issued.email}. Code: ${issued.code}. This file is Verified.`)}`);
  }
  if (decision === "DECLINED") {
    await prisma.inviteRequest.update({ where: { id: record.inviteRequest.id }, data: { status: "DECLINED" } });
    await applyDecisionStatus({ caseId: record.id, decision, actorId: admin.id, actorName: admin.name });
    revalidatePath("/admin/applications");
    revalidatePath("/admin/verification");
    redirect(`${back}&notice=${encodeURIComponent("Declined. This file is Rejected.")}`);
  }
  await applyDecisionStatus({ caseId: record.id, decision: "NEEDS_INFO", actorId: admin.id, actorName: admin.name });
  if (note) {
    await prisma.verificationCase.update({
      where: { id: record.id },
      data: { internalNote: note.slice(0, 4000) },
    });
  }
  revalidatePath("/admin/verification");
  redirect(`${back}&notice=${encodeURIComponent("Asked for more info. This file is Needs info.")}`);
}
