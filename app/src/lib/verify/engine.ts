import type { EvidenceStatus, RunSubject, Verdict } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { collectChecks, type CheckContext } from "@/lib/verify/checks";
import { scoreReport } from "@/lib/verify/score";
import type { ApplicantFacts } from "@/lib/verify/types";
import { politeFetch } from "@/lib/verify/fetch";
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
  await prisma.verificationRun.update({
    where: { id: run.id },
    data: { status: "RUNNING", startedAt: run.startedAt ?? new Date(), error: "" },
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
      })),
    });
    await prisma.verificationRun.update({
      where: { id: run.id },
      data: {
        status: "DONE",
        score: report.score,
        verdict: report.verdict as Verdict,
        summary: report.summary,
        finishedAt: new Date(),
      },
    });
    if (run.application && (run.application.status === "SUBMITTED" || run.application.status === "PENDING")) {
      await prisma.application.update({
        where: { id: run.application.id },
        data: { status: "IN_REVIEW" },
      });
    }
  } catch (error) {
    await prisma.verificationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Verification failed.",
        finishedAt: new Date(),
        summary: "Recommendation: NEEDS YOUR DECISION. The verification job failed before it could finish. Richard Osika should read the application directly. What I could not check for free: the sources this job did not reach.",
        verdict: "NEEDS_OWNER_DECISION",
        score: 0,
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
  } | null;
}): Promise<ApplicantFacts> {
  const application = run.application;
  const name = run.subject === "COMPANY" ? run.companyName || application?.org || "" : application?.name || run.companyName;
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
  return {
    name,
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
    cardText: "",
    duplicateOfMember: run.subject === "APPLICATION" ? duplicateOfMember : false,
    duplicateOfDeclined,
    recentApplications,
  };
}
