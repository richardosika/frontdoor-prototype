import type { VerificationCaseStatus, VerificationCheckResult, VerificationSubject } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  MEMBER_CHECKS,
  PROJECT_CHECKS,
  VOUCH_CHECK_KEY,
  canMarkCaseVerified,
  decisionLabel,
  isCheckResult,
  referenceCheckForApplication,
  statusForDecision,
  verificationStatusLabel,
  vouchEvidenceNote,
  type VerificationStatus,
} from "@/lib/verification";

const TEMPLATES = {
  MEMBER: MEMBER_CHECKS,
  PROJECT: PROJECT_CHECKS,
} as const;

export async function ensureVerificationCase(input: {
  subject: VerificationSubject;
  userId?: string;
  projectId?: string;
  applicationId?: string;
  inviteRequestId?: string;
  actorId?: string;
}) {
  const byUser = input.userId ? await prisma.verificationCase.findUnique({ where: { userId: input.userId } }) : null;
  if (byUser) {
    if (input.applicationId && !byUser.applicationId) {
      const taken = await prisma.verificationCase.findUnique({ where: { applicationId: input.applicationId }, select: { id: true } });
      if (!taken) {
        return prisma.verificationCase.update({ where: { id: byUser.id }, data: { applicationId: input.applicationId } });
      }
    }
    return byUser;
  }
  const byApplication = input.applicationId
    ? await prisma.verificationCase.findUnique({ where: { applicationId: input.applicationId } })
    : null;
  if (byApplication) {
    if (input.userId && !byApplication.userId) {
      return prisma.verificationCase.update({ where: { id: byApplication.id }, data: { userId: input.userId } });
    }
    return byApplication;
  }
  const byInvite = input.inviteRequestId
    ? await prisma.verificationCase.findUnique({ where: { inviteRequestId: input.inviteRequestId } })
    : null;
  if (byInvite) return byInvite;
  const byProject = input.projectId ? await prisma.verificationCase.findUnique({ where: { projectId: input.projectId } }) : null;
  if (byProject) return byProject;
  return prisma.verificationCase.create({
    data: {
      subject: input.subject,
      userId: input.userId,
      projectId: input.projectId,
      applicationId: input.applicationId,
      inviteRequestId: input.inviteRequestId,
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

export async function noteApplicationReferences(input: {
  userId: string;
  applicationId?: string;
  actorId: string;
  referenceEmails: string[];
  speaker?: string;
}) {
  const record = await ensureVerificationCase({
    subject: "MEMBER",
    userId: input.userId,
    applicationId: input.applicationId,
    actorId: input.actorId,
  });
  const check = referenceCheckForApplication(input);
  await prisma.verificationCheck.update({
    where: { caseId_key: { caseId: record.id, key: VOUCH_CHECK_KEY } },
    data: { result: check.result, note: check.note },
  });
  if (check.result === "NOT_PROVIDED") {
    await prisma.verificationEvent.create({
      data: {
        caseId: record.id,
        actorId: input.actorId,
        fromStatus: "NOT_STARTED",
        toStatus: "NOT_STARTED",
        summary: "References and vouches marked Not provided. The case stays Not started.",
      },
    });
  }
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
        ? `${input.adminName} reviewed the vouch evidence and accepted it. Membership stays Approved.`
        : `${input.adminName} reviewed the vouch evidence and did not accept it. Membership is unchanged.`,
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

/** The decision sets the file status. A manual status menu does not. */
export async function applyDecisionStatus(input: {
  caseId: string;
  decision: "APPROVED" | "DECLINED" | "NEEDS_INFO";
  actorId: string;
  actorName: string;
  auditNote?: string;
}) {
  const existing = await prisma.verificationCase.findUnique({ where: { id: input.caseId } });
  if (!existing) return;
  const toStatus = statusForDecision(input.decision);
  const verifiedAt = toStatus === "VERIFIED" ? existing.verifiedAt ?? new Date() : existing.verifiedAt;
  await prisma.verificationCase.update({
    where: { id: existing.id },
    data: { status: toStatus, verifiedAt },
  });
  await prisma.verificationEvent.create({
    data: {
      caseId: existing.id,
      actorId: input.actorId,
      fromStatus: existing.status,
      toStatus,
      summary: [`${input.actorName} chose ${decisionLabel(input.decision)}. File status is ${verificationStatusLabel(toStatus)}.`, input.auditNote || ""]
        .filter(Boolean)
        .join(" "),
    },
  });
}
