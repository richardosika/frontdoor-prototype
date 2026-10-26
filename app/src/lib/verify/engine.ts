import type { EvidenceStatus, Prisma, RunSubject, Verdict } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { collectChecks, type CheckContext } from "@/lib/verify/checks";
import { failedGrade, gradeChangeNote, gradeChecks, gradePlainText, parseGradeSnapshot } from "@/lib/verify/grade";
import { scoreReport, summaryTail } from "@/lib/verify/score";
import type { ApplicantFacts } from "@/lib/verify/types";
import { politeFetch } from "@/lib/verify/fetch";
import { readCardImage } from "@/lib/verify/ocr";
import { loadWatchlist } from "@/lib/verify/watchlist";

export async function createVerificationRun(input: {
  subject: RunSubject;
  applicationId?: string | null;
  projectId?: string | null;
  companyName?: string;
}): Promise<string> {
  const run = await prisma.verificationRun.create({
    data: {
      subject: input.subject,
      applicationId: input.applicationId || null,
      projectId: input.projectId || null,
      companyName: input.companyName || "",
      status: "PENDING",
    },
  });
  return run.id;
}

export async function executeVerificationRun(runId: string, options?: { network?: boolean }): Promise<void> {
  const run = await prisma.verificationRun.findUnique({
    where: { id: runId },
    include: { application: { include: { inviteCode: true, businessCard: true } } },
  });
  if (!run) return;
  const preservedError = run.error.startsWith("watchdog-retry:") ? run.error : "";
  await prisma.verificationRun.update({
    where: { id: run.id },
    data: { status: "RUNNING", startedAt: new Date(), error: preservedError },
  });
  try {
    const facts = await factsForRun(run);
    const watch = await loadWatchlist().catch(() => ({ entries: [], fetchedAt: null }));
    const network = options?.network ?? !facts.testProfile;
    const ctx: CheckContext = {
      facts,
      watchlist: watch.entries,
      network,
      fetchText: politeFetch,
    };
    const report = scoreReport(await collectChecks(ctx));
    const finishedAt = new Date();
    const previous = run.applicationId
      ? await prisma.verificationRun.findFirst({
          where: { applicationId: run.applicationId, subject: run.subject, status: "DONE", id: { not: run.id } },
          orderBy: { finishedAt: "desc" },
          select: { gradeSnapshot: true },
        })
      : null;
    const graded = gradeChecks(report.checks, facts, { gradedAt: finishedAt.toISOString(), subject: run.subject });
    graded.changeNote = gradeChangeNote(parseGradeSnapshot(previous?.gradeSnapshot), graded);
    graded.plainText = gradePlainText(graded);
    await prisma.verificationEvidence.deleteMany({ where: { runId: run.id } });
    await prisma.verificationEvidence.createMany({
      data: report.checks.map((check) => ({
        runId: run.id,
        checkKey: check.key,
        status: check.status as EvidenceStatus,
        weight: check.weight,
        finding: check.finding,
        source: check.source,
        url: check.url,
        ranAt: Number.isNaN(new Date(check.ranAt).getTime()) ? new Date() : new Date(check.ranAt),
        hardFlag: Boolean(check.hardFlag),
        reviewFlag: Boolean(check.reviewFlag),
        corroborates: Boolean(check.corroborates),
      })),
    });
    await prisma.verificationRun.update({
      where: { id: run.id },
      data: {
        status: "DONE",
        score: report.score,
        verdict: report.verdict as Verdict,
        summary: `${graded.plainText} ${summaryTail(report.checks, report.verdict)}`.replace(/\s+/g, " ").trim(),
        gradeLetter: graded.letter,
        gradeScore: graded.score,
        gradeConfidence: graded.confidence,
        recommendation: graded.recommendation,
        gradeSnapshot: graded as unknown as Prisma.InputJsonValue,
        error: "",
        finishedAt,
      },
    });
    if (run.application && (run.application.status === "SUBMITTED" || run.application.status === "PENDING")) {
      await prisma.application.update({
        where: { id: run.application.id },
        data: { status: "IN_REVIEW" },
      });
    }
    if (run.applicationId) {
      const { prefillFromApplication } = await import("@/lib/guided-prefill-db");
      await prefillFromApplication(run.applicationId).catch((prefillError) => {
        console.error("guided prefill failed", prefillError instanceof Error ? prefillError.message : "error");
      });
    }
    if (run.subject === "PROJECT" && run.projectId) {
      const { prefillFromProject } = await import("@/lib/guided-prefill-db");
      await prefillFromProject(run.projectId).catch((prefillError) => {
        console.error("guided prefill failed", prefillError instanceof Error ? prefillError.message : "error");
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed.";
    const graded = failedGrade(message);
    await prisma.verificationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: message,
        finishedAt: new Date(),
        summary: `${graded.plainText} Recommendation: NEEDS YOUR DECISION. What I could not check for free: the sources this job did not reach.`,
        verdict: "NEEDS_OWNER_DECISION",
        score: 0,
        gradeLetter: graded.letter,
        gradeScore: 0,
        gradeConfidence: graded.confidence,
        recommendation: graded.recommendation,
        gradeSnapshot: graded as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

async function factsForRun(run: {
  subject: RunSubject;
  companyName: string;
  projectId: string | null;
  application: {
    name: string;
    email: string;
    org: string;
    location: string;
    role: string;
    phone: string;
    website: string;
    linkedinUrl: string;
    socialLinks: string;
    statement: string;
    testProfile: string;
    inviteCode: { note: string; code: string } | null;
    businessCard?: { deletedAt: Date | null; sizeBytes: number; contentType?: string; bytes?: Uint8Array | null } | null;
    referenceEmails?: string[];
  } | null;
}): Promise<ApplicantFacts> {
  const application = run.application;
  const applicantName = application?.name || "";
  const name = run.subject === "COMPANY" ? run.companyName || application?.org || applicantName : applicantName || run.companyName;
  const org = run.subject === "PROJECT" ? run.companyName || application?.org || "" : application?.org || run.companyName;
  const email = application?.email || "";
  const duplicateOfMember = email
    ? Boolean(await prisma.user.findUnique({ where: { email }, select: { id: true } }))
    : false;
  const duplicateOfDeclined = email
    ? Boolean(
        await prisma.application.findFirst({
          where: { email, status: { in: ["REJECTED", "DECLINED"] } },
          select: { id: true },
        }),
      )
    : false;
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recentApplications = email
    ? await prisma.application.count({
        where: { email, createdAt: { gte: since }, ...(application ? { NOT: { email: "" } } : {}) },
      })
    : 0;
  const card = application?.businessCard;
  const cardUploaded = Boolean(card && !card.deletedAt && card.sizeBytes > 0);
  const cardText =
    cardUploaded && card?.contentType?.startsWith("image/") && card.bytes
      ? await readCardImage(card.contentType, card.bytes)
      : "";
  return {
    name,
    applicantName,
    email,
    org,
    location: application?.location || "",
    role: application?.role || "DEVELOPER",
    phone: application?.phone || "",
    website: application?.website || "",
    linkedinUrl: application?.linkedinUrl || "",
    socialLinks: application?.socialLinks || "",
    statement: application?.statement || "",
    inviteNote: application?.inviteCode ? `${application.inviteCode.code} · ${application.inviteCode.note}` : "",
    testProfile: application?.testProfile || "",
    cardText,
    cardUploaded,
    duplicateOfMember: run.subject === "APPLICATION" ? duplicateOfMember : false,
    duplicateOfDeclined,
    recentApplications,
    referenceCount: application?.referenceEmails?.length ?? 0,
  };
}
