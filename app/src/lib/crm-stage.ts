import { blocksMembership } from "@/lib/payments";

export const CRM_STAGES = ["INVITED", "APPLIED", "IN_REVIEW", "APPROVED", "ACTIVE", "DECLINED"] as const;

export type CrmStageId = (typeof CRM_STAGES)[number];

export const CRM_STAGE_LABELS: Record<CrmStageId, string> = {
  INVITED: "Invited",
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

export function crmStage(input: {
  inviteStatus?: string | null;
  applicationStatus?: string | null;
  memberActive?: boolean;
  paymentStatus?: string | null;
  manualStage?: string | null;
}): CrmStageId {
  if (input.manualStage && (CRM_STAGES as readonly string[]).includes(input.manualStage)) {
    return input.manualStage as CrmStageId;
  }
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
  if (kind === "invited") return "Invited";
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
