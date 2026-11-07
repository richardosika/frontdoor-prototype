import type { Prisma } from "@prisma/client";
import { createVerificationRun, executeVerificationRun } from "@/lib/verify/engine";
import { failedGrade } from "@/lib/verify/grade";
import { prisma } from "@/lib/prisma";
import { stuckRunDecision } from "@/lib/verify/watchdog";

const inflight = new Set<string>();

export function enqueueVerification(runId: string, options?: { network?: boolean }) {
  if (inflight.has(runId)) return;
  inflight.add(runId);
  void executeVerificationRun(runId, options)
    .catch((error) => {
      console.error("verification job failed", runId, error);
    })
    .finally(() => {
      inflight.delete(runId);
    });
}

let resumed = false;

export async function queueApplicationVerification(
  applicationId: string,
  companyName: string,
  options?: { network?: boolean; wait?: boolean },
) {
  const applicationRun = await createVerificationRun({
    subject: "APPLICATION",
    applicationId,
    companyName,
  });
  const companyRun = await createVerificationRun({
    subject: "COMPANY",
    applicationId,
    companyName,
  });
  if (options?.wait) {
    await executeVerificationRun(applicationRun, { network: options.network });
    await executeVerificationRun(companyRun, { network: options.network });
    return;
  }
  enqueueVerification(applicationRun, { network: options?.network });
  enqueueVerification(companyRun, { network: options?.network });
}

export async function queueProjectVerification(projectId: string, name: string) {
  const runId = await createVerificationRun({ subject: "PROJECT", projectId, companyName: name });
  enqueueVerification(runId, { network: true });
}

const FAILED_SUMMARY =
  "Recommendation: NEEDS YOUR DECISION. This run was still going after several minutes, so it was stopped. Use Re-run verification. What I could not check for free: the sources this run did not finish.";

/** Stop or retry a run that is still pending or running after the watchdog window. */
export async function settleStuckRuns(now = new Date()): Promise<void> {
  const runs = await prisma.verificationRun.findMany({
    where: { status: { in: ["PENDING", "RUNNING"] } },
    select: {
      id: true,
      status: true,
      startedAt: true,
      createdAt: true,
      error: true,
      application: { select: { testProfile: true } },
    },
    take: 40,
  });
  for (const run of runs) {
    const decision = stuckRunDecision(run, now);
    if (decision === "wait") continue;
    if (inflight.has(run.id)) {
      await markRunTimedOut(run.id, now);
      continue;
    }
    if (decision === "retry") {
      const claimed = await prisma.verificationRun.updateMany({
        where: { id: run.id, status: { in: ["PENDING", "RUNNING"] } },
        data: { status: "PENDING", startedAt: new Date(), error: "watchdog-retry:1" },
      });
      if (claimed.count) enqueueVerification(run.id, { network: !run.application?.testProfile });
      continue;
    }
    await markRunTimedOut(run.id, now);
  }
}

async function markRunTimedOut(runId: string, now: Date): Promise<void> {
  const graded = failedGrade("This run was still going after several minutes, so it was stopped.", now.toISOString());
  await prisma.verificationRun.updateMany({
    where: { id: runId, status: { in: ["PENDING", "RUNNING"] } },
    data: {
      status: "FAILED",
      finishedAt: now,
      error: "The verification run timed out.",
      verdict: "NEEDS_OWNER_DECISION",
      score: 0,
      summary: `${graded.plainText} ${FAILED_SUMMARY}`,
      gradeLetter: graded.letter,
      gradeScore: 0,
      gradeConfidence: graded.confidence,
      recommendation: graded.recommendation,
      gradeSnapshot: graded as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function resumeVerificationJobs() {
  if (resumed) return;
  resumed = true;
  await settleStuckRuns().catch((error) => {
    console.error("verification watchdog failed", error);
  });
  const runs = await prisma.verificationRun.findMany({
    where: { status: { in: ["PENDING", "RUNNING"] } },
    select: { id: true, application: { select: { testProfile: true } } },
    take: 20,
  });
  for (const run of runs) {
    enqueueVerification(run.id, { network: !run.application?.testProfile });
  }
}
