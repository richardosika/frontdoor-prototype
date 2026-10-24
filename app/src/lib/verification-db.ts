import type { VerificationCaseStatus, VerificationCheckResult, VerificationSubject } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  MEMBER_CHECKS,
  PROJECT_CHECKS,
  VOUCH_CHECK_KEY,
  canMarkCaseVerified,
  isCheckResult,
  verificationStatusLabel,
  vouchEvidenceNote,
  type VerificationStatus,
} from "@/lib/verification";

const TEMPLATES = {
  MEMBER: MEMBER_CHECKS,
  PROJECT: PROJECT_CHECKS,
} as const;

export async function ensureVerificationCase(input: { subject: VerificationSubject; userId?: string; projectId?: string; actorId?: string }) {
  const existing = input.userId
    ? await prisma.verificationCase.findUnique({ where: { userId: input.userId } })
    : input.projectId
      ? await prisma.verificationCase.findUnique({ where: { projectId: input.projectId } })
      : null;
  if (existing) return existing;
  return prisma.verificationCase.create({
    data: {
      subject: input.subject,
      userId: input.userId,
      projectId: input.projectId,
      status: "NOT_STARTED",
      checks: {
        create: TEMPLATES[input.subject].map((item) => ({ key: item.key, label: item.label })),
      },
      events: {
        create: {
          actorId: input.actorId,
          toStatus: "NOT_STARTED",
          summary: "Verification case opened.",
        },
      },
    },
  });
}

export async function attachVouchEvidence(input: {
  memberId: string;
  projectName: string;
  counterpartyName: string;
  note: string;
  evidenceUrl: string;
}) {
  const record = await ensureVerificationCase({ subject: "MEMBER", userId: input.memberId });
  const full = await prisma.verificationCase.findUnique({
    where: { id: record.id },
    include: { checks: true },
  });
  if (!full) return;
  const check = full.checks.find((item) => item.key === VOUCH_CHECK_KEY);
  const evidence = vouchEvidenceNote(input);
  if (check && check.result !== "PASS") {
    await prisma.verificationCheck.update({
      where: { id: check.id },
      data: {
        note: evidence,
        evidenceUrl: input.evidenceUrl,
        result: "PENDING",
        reviewerId: null,
        reviewedAt: null,
      },
    });
  }
  if (full.status === "NOT_STARTED") {
    await prisma.verificationCase.update({
      where: { id: full.id },
      data: { status: "IN_REVIEW" },
    });
    await prisma.verificationEvent.create({
      data: {
        caseId: full.id,
        fromStatus: "NOT_STARTED",
        toStatus: "IN_REVIEW",
        summary: evidence,
      },
    });
  } else {
    await prisma.verificationEvent.create({
      data: {
        caseId: full.id,
        fromStatus: full.status,
        toStatus: full.status,
        summary: evidence,
      },
    });
  }
}

export async function reviewVouchOnChecklist(input: {
  memberId: string;
  adminId: string;
  adminName: string;
  accepted: boolean;
  projectName: string;
  counterpartyName: string;
}) {
  const record = await ensureVerificationCase({ subject: "MEMBER", userId: input.memberId, actorId: input.adminId });
  const check = await prisma.verificationCheck.findUnique({
    where: { caseId_key: { caseId: record.id, key: VOUCH_CHECK_KEY } },
  });
  if (!check) return;
  const result: VerificationCheckResult = input.accepted ? "PASS" : "FAIL";
  await prisma.verificationCheck.update({
    where: { id: check.id },
    data: {
      result,
      reviewerId: input.adminId,
      reviewedAt: new Date(),
      note: input.accepted
        ? `${input.adminName} accepted ${input.counterpartyName}'s vouch on ${input.projectName}.`
        : `${input.adminName} did not accept ${input.counterpartyName}'s vouch on ${input.projectName}.`,
    },
  });
  await prisma.verificationEvent.create({
    data: {
      caseId: record.id,
      actorId: input.adminId,
      fromStatus: record.status,
      toStatus: record.status,
      summary: input.accepted
        ? `${input.adminName} reviewed the vouch evidence and accepted it before the tier change.`
        : `${input.adminName} reviewed the vouch evidence and did not accept it. Tier unchanged.`,
    },
  });
}

export async function assertChecklistAllowsVerified(caseId: string, next: VerificationStatus) {
  if (next !== "VERIFIED") return { ok: true as const };
  const checks = await prisma.verificationCheck.findMany({ where: { caseId } });
  return canMarkCaseVerified(checks);
}

export async function writeStatusEvent(input: {
  caseId: string;
  actorId: string;
  actorName: string;
  fromStatus: VerificationCaseStatus;
  toStatus: VerificationCaseStatus;
}) {
  if (input.fromStatus === input.toStatus) return;
  await prisma.verificationEvent.create({
    data: {
      caseId: input.caseId,
      actorId: input.actorId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      summary: `${input.actorName} changed the status from ${verificationStatusLabel(input.fromStatus)} to ${verificationStatusLabel(input.toStatus)}.`,
    },
  });
}

export function parseCheckResult(value: string): VerificationCheckResult | null {
  return isCheckResult(value) ? value : null;
}
