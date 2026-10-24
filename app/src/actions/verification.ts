"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireVerificationAdmin } from "@/lib/current-user";
import {
  assertChecklistAllowsVerified,
  parseCheckResult,
  writeStatusEvent,
} from "@/lib/verification-db";
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

  const record = await prisma.verificationCase.findUnique({ where: { id: check.caseId } });
  if (!record) notFound();
  await prisma.verificationCheck.update({
    where: { id: check.id },
    data: {
      result,
      note,
      evidenceUrl,
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
      summary: `${admin.name} set “${check.label}” to ${checkResultLabel(result)}.`,
    },
  });

  revalidatePath(back);
  revalidatePath("/admin/verification");
  redirect(`${back}?notice=Checklist+saved`);
}
