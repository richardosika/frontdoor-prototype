"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { confirmedNote } from "@/lib/guided-prefill";
import {
  isReviewStepId,
  isStepStatus,
  nextStepId,
  parseReviewProgress,
  type ReviewProgress,
  type ReviewStepId,
  type StepMark,
} from "@/lib/review-steps";

function backTo(caseId: string, step: ReviewStepId, notice?: string, error?: string) {
  const params = new URLSearchParams();
  params.set("step", step);
  if (notice) params.set("notice", notice);
  if (error) params.set("error", error);
  return `/admin/verification/${caseId}?${params.toString()}`;
}

export async function saveReviewStep(formData: FormData) {
  const admin = await requireAdmin();
  const applicationId = String(formData.get("applicationId") || "");
  const postedCaseId = String(formData.get("caseId") || "");
  const stepId = String(formData.get("stepId") || "");
  const intent = String(formData.get("intent") || "save");
  const record = postedCaseId
    ? await prisma.verificationCase.findUnique({ where: { id: postedCaseId } })
    : applicationId
      ? await prisma.verificationCase.findUnique({ where: { applicationId } })
      : null;
  if (!record || !isReviewStepId(stepId) || (stepId === "decision" && intent !== "jump")) {
    redirect(record ? backTo(record.id, "identity", undefined, "That review step was not recognized.") : "/admin/verification?error=That+review+step+was+not+recognized.");
  }
  const application = record.applicationId
    ? await prisma.application.findUnique({ where: { id: record.applicationId } })
    : applicationId
      ? await prisma.application.findUnique({ where: { id: applicationId } })
      : null;

  const progress = record.reviewProgress ? parseReviewProgress(record.reviewProgress) : parseReviewProgress(application?.reviewProgress);
  const now = new Date().toISOString();
  let destination: ReviewStepId = stepId;
  let summary = "";

  if (intent === "jump") {
    destination = stepId;
    progress.current = stepId;
  } else if (intent === "skip") {
    const reason = String(formData.get("skipReason") || "").trim().slice(0, 500);
    if (reason.length < 8) redirect(backTo(record.id, stepId, undefined, "A skip needs a short reason (at least 8 characters)."));
    const mark: StepMark = {
      status: "SKIPPED",
      note: String(formData.get("note") || "").trim().slice(0, 2000),
      evidenceUrl: "",
      skipReason: reason,
      updatedAt: now,
    };
    progress.steps[stepId] = mark;
    destination = nextStepId(stepId);
    progress.current = destination;
    summary = `${admin.name} skipped “${stepId}” (not a pass). Reason: ${reason}`;
  } else {
    const status = String(formData.get("status") || "");
    if (!isStepStatus(status) || status === "SKIPPED") {
      redirect(backTo(record.id, stepId, undefined, "Choose Pass, Concern, Fail, or Couldn't verify. Use Skip for an override."));
    }
    const evidenceUrl = String(formData.get("evidenceUrl") || "").trim().slice(0, 500);
    if (evidenceUrl && !/^https?:\/\//i.test(evidenceUrl)) {
      redirect(backTo(record.id, stepId, undefined, "Evidence links must start with http."));
    }
    if (status === "PASS" && !/^https?:\/\//i.test(evidenceUrl)) {
      redirect(backTo(record.id, stepId, undefined, "A pass needs an evidence link. Couldn't verify is not a pass."));
    }
    const mark: StepMark = {
      status,
      note: confirmedNote(String(formData.get("note") || "")).slice(0, 2000),
      evidenceUrl,
      skipReason: "",
      updatedAt: now,
    };
    progress.steps[stepId] = mark;
    destination = nextStepId(stepId);
    progress.current = destination;
    summary = `${admin.name} saved review step ${stepId} as ${status}. A skip is the only override, and this was not a skip.`;
  }

  const stored: ReviewProgress = { version: 1, current: progress.current, steps: progress.steps };
  await prisma.verificationCase.update({
    where: { id: record.id },
    data: { reviewProgress: stored },
  });
  if (application) {
    await prisma.application.update({
      where: { id: application.id },
      data: { reviewProgress: stored },
    });
  }
  if (summary) {
    await prisma.moderationEvent.create({
      data: {
        actorId: admin.id,
        action: intent === "skip" ? "review_skip" : "review_step",
        summary: summary.slice(0, 500),
      },
    });
    await prisma.verificationEvent.create({
      data: {
        caseId: record.id,
        actorId: admin.id,
        fromStatus: record.status,
        toStatus: record.status,
        summary: summary.slice(0, 500),
      },
    });
  }
  if (application) revalidatePath(`/admin/applications/${application.id}`);
  revalidatePath(`/admin/verification/${record.id}`);
  revalidatePath("/admin/audit");
  redirect(backTo(record.id, destination, intent === "jump" ? undefined : "Progress saved."));
}
