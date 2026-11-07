import { blocksMembership } from "@/lib/payments";

export const CRM_STAGES = ["INVITED", "APPLIED", "IN_REVIEW", "APPROVED", "ACTIVE", "DECLINED"] as const;

/** Stages the CRM menu may set. Approve, Active, and Declined come from the guided review decision. */
export const STAGE_OVERRIDE_OPTIONS = ["INVITED", "APPLIED", "IN_REVIEW"] as const;

const DECISION_STAGES = ["APPROVED", "ACTIVE", "DECLINED"] as const;

export type CrmStageId = (typeof CRM_STAGES)[number];

export const CRM_STAGE_LABELS: Record<CrmStageId, string> = {
  INVITED: "Requested",
  APPLIED: "Applied",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  ACTIVE: "Active",
  DECLINED: "Declined",
};

export function crmStageLabel(stage: string): string {
  if (stage in CRM_STAGE_LABELS) return CRM_STAGE_LABELS[stage as CrmStageId];
  return stage;
}

export function isDecisionStage(stage: string): boolean {
  return (DECISION_STAGES as readonly string[]).includes(stage);
}

/** A stored override counts only when it does not approve, activate, or decline. */
export function stageOverride(stage: string | null | undefined): (typeof STAGE_OVERRIDE_OPTIONS)[number] | null {
  if (stage && (STAGE_OVERRIDE_OPTIONS as readonly string[]).includes(stage)) {
    return stage as (typeof STAGE_OVERRIDE_OPTIONS)[number];
  }
  return null;
}

export function crmStage(input: {
  inviteStatus?: string | null;
  applicationStatus?: string | null;
  memberActive?: boolean;
  paymentStatus?: string | null;
  manualStage?: string | null;
}): CrmStageId {
  const override = stageOverride(input.manualStage);
  if (override) return override;
  if (input.memberActive) {
    if (input.paymentStatus && blocksMembership(input.paymentStatus)) return "APPROVED";
    return "ACTIVE";
  }
  const app = input.applicationStatus;
  if (app === "DECLINED" || app === "REJECTED") return "DECLINED";
  if (app === "APPROVED") return "ACTIVE";
  if (app === "PAYMENT_DUE") return "APPROVED";
  if (app === "IN_REVIEW" || app === "NEEDS_INFO") return "IN_REVIEW";
  if (app === "SUBMITTED" || app === "PENDING") return "APPLIED";
  if (input.inviteStatus === "DECLINED") return "DECLINED";
  return "INVITED";
}

export function followUpDue(date: Date | null, now = new Date()): boolean {
  if (!date) return false;
  return date.getTime() <= now.getTime();
}

export function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function eventKindLabel(kind: string): string {
  if (kind === "invited") return "Requested";
  if (kind === "applied") return "Applied";
  if (kind === "email") return "Email";
  if (kind === "verification") return "Verification";
  if (kind === "decision") return "Decision";
  if (kind === "payment") return "Payment";
  if (kind === "note") return "Note";
  if (kind === "follow_up") return "Follow-up";
  if (kind === "suppressed") return "Not sent";
  return kind;
}
