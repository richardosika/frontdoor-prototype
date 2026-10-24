import { createVerificationRun, executeVerificationRun } from "@/lib/verify/engine";
import { prisma } from "@/lib/prisma";

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

export async function resumeVerificationJobs() {
  if (resumed) return;
  resumed = true;
  const runs = await prisma.verificationRun.findMany({
    where: { status: { in: ["PENDING", "RUNNING"] } },
    select: { id: true, application: { select: { testProfile: true } } },
    take: 20,
  });
  for (const run of runs) {
    enqueueVerification(run.id, { network: !run.application?.testProfile });
  }
}
