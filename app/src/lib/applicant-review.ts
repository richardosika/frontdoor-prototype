import { OPEN_APPLICATION_STATUSES } from "@/lib/application-status";
import { annualDuesCents } from "@/lib/dues";
import { prisma } from "@/lib/prisma";
import {
  buildReviewSteps,
  parseReviewProgress,
  reviewStepFromQuery,
  skippedFrom,
  unverifiedPersonItems,
  type BuiltStep,
  type ReviewStepId,
  type StepEvidence,
} from "@/lib/review-steps";
import { applyReviewSkips, parseGradeSnapshot, type GradeReport } from "@/lib/verify/grade";

export type MemberReviewMode = "application" | "invite" | "closed";

export type MemberReview = {
  steps: BuiltStep[];
  currentId: ReviewStepId;
  grade: GradeReport | null;
  paying: boolean;
  notLegit: boolean;
  confirmLabel: string;
  applicationId: string | null;
  inviteRequestId: string | null;
  mode: MemberReviewMode;
  unverified: string[];
  applicationGrade: { letter: string; score: number } | null;
};

function rowsFromSnapshot(value: unknown): StepEvidence[] {
  if (!Array.isArray(value)) return [];
  const out: StepEvidence[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.checkKey !== "string") continue;
    out.push({
      checkKey: row.checkKey,
      status: typeof row.status === "string" ? row.status : "",
      finding: typeof row.finding === "string" ? row.finding : "",
      source: typeof row.source === "string" ? row.source : "",
      url: typeof row.url === "string" ? row.url : "",
      corroborates: row.corroborates === true,
    });
  }
  return out;
}

/** The 8-step review for one applicant file. Applications, People, and Verification files all use this. */
export async function loadMemberReview(caseId: string, stepQuery?: string): Promise<MemberReview | null> {
  const record = await prisma.verificationCase.findUnique({
    where: { id: caseId },
    include: {
      application: { include: { businessCard: true } },
      inviteRequest: true,
      user: { select: { name: true, org: true, location: true, linkedinUrl: true, website: true, bio: true } },
    },
  });
  if (!record || record.subject !== "MEMBER") return null;

  const application =
    record.application ||
    (record.userId
      ? await prisma.application.findFirst({
          where: { userId: record.userId },
          orderBy: { createdAt: "desc" },
          include: { businessCard: true },
        })
      : null);

  let evidence = rowsFromSnapshot(record.sourceSnapshot);
  let verdict = "";
  let applicationGrade: { letter: string; score: number } | null = null;
  const applicationId = application?.id || null;
  if (applicationId) {
    const run = await prisma.verificationRun.findFirst({
      where: { applicationId, subject: "APPLICATION", status: "DONE" },
      orderBy: { finishedAt: "desc" },
      include: { evidence: true },
    });
    verdict = run?.verdict || "";
    if (run?.gradeLetter && typeof run.gradeScore === "number") {
      applicationGrade = { letter: run.gradeLetter, score: run.gradeScore };
    }
    if (!evidence.length) {
      evidence = (run?.evidence ?? []).map((item) => ({
        checkKey: item.checkKey,
        status: item.status,
        finding: item.finding,
        source: item.source,
        url: item.url,
        corroborates: item.corroborates,
      }));
    }
  }

  const card = application?.businessCard;
  const cardOnFile = Boolean(card && !card.deletedAt && card.sizeBytes > 0);
  const invite = record.inviteRequest;
  const user = record.user;
  const progress = record.reviewProgress ? parseReviewProgress(record.reviewProgress) : parseReviewProgress(application?.reviewProgress);
  const steps = buildReviewSteps({
    evidence,
    saved: progress,
    references: application?.referenceEmails || [],
    cardOnFile,
    facts: {
      name: application?.name || invite?.name || user?.name || "",
      org: application?.org || invite?.org || user?.org || "",
      location: application?.location || invite?.location || user?.location || "",
      statement: application?.statement || invite?.note || user?.bio || "",
      linkedinUrl: application?.linkedinUrl || user?.linkedinUrl || "",
      website: application?.website || user?.website || "",
      referenceEmails: application?.referenceEmails || [],
      cardOnFile,
    },
  });
  const baseGrade = parseGradeSnapshot(record.gradeSnapshot) || (applicationId ? parseGradeSnapshot(
    (
      await prisma.verificationRun.findFirst({
        where: { applicationId, subject: "APPLICATION", status: "DONE" },
        orderBy: { finishedAt: "desc" },
        select: { gradeSnapshot: true },
      })
    )?.gradeSnapshot,
  ) : null);
  const grade = baseGrade
    ? applyReviewSkips(
        baseGrade,
        skippedFrom(steps).map((step) => ({ title: step.title, reason: step.saved?.skipReason || "" })),
      )
    : null;
  const paying = Boolean(application && annualDuesCents(application.role) > 0 && !application.duesWaived);
  const open = Boolean(application && (OPEN_APPLICATION_STATUSES as readonly string[]).includes(application.status));
  const invitePending = Boolean(!application && invite && invite.status === "PENDING");
  return {
    steps,
    currentId: reviewStepFromQuery(stepQuery, progress.current),
    grade,
    paying,
    notLegit: grade?.recommendation === "DECLINE" || verdict === "NOT_LEGIT",
    confirmLabel: grade?.recommendation === "DECLINE" ? "The recommendation is DECLINE." : "The recommendation is NOT LEGIT.",
    applicationId,
    inviteRequestId: invite?.id || null,
    mode: open ? "application" : invitePending ? "invite" : "closed",
    unverified: unverifiedPersonItems(evidence),
    applicationGrade,
  };
}
