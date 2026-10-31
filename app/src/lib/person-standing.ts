/**
 * One status for every person. Applications, Members, and People all call this.
 * Pending = waiting to be checked. Approved = Richard approved them. Declined = not approved.
 * The stage is a sub-label (requested, applied, in review, active, payment due). It is not a second status.
 */

export const PERSON_STATUSES = ["PENDING", "APPROVED", "DECLINED"] as const;
export type PersonStatus = (typeof PERSON_STATUSES)[number];

export const PERSON_STAGES = ["REQUESTED", "APPLIED", "IN_REVIEW", "ACTIVE", "PAYMENT_DUE", "DECLINED"] as const;
export type PersonStage = (typeof PERSON_STAGES)[number];

export type PersonStanding = { status: PersonStatus; stage: PersonStage };

const PAYMENT_DUE = new Set(["DUE", "PAST_DUE", "FAILED", "PAYMENT_DUE"]);

export function personStatusLabel(status: string): string {
  if (status === "APPROVED") return "Approved";
  if (status === "DECLINED") return "Declined";
  return "Pending";
}

export function personStageLabel(stage: string): string {
  if (stage === "REQUESTED") return "Requested to join";
  if (stage === "APPLIED") return "Applied";
  if (stage === "IN_REVIEW") return "In review";
  if (stage === "ACTIVE") return "Active";
  if (stage === "PAYMENT_DUE") return "Payment due";
  if (stage === "DECLINED") return "Declined";
  return stage;
}

export function personStanding(input: {
  applicationStatus?: string | null;
  inviteStatus?: string | null;
  accountStatus?: string | null;
  paymentStatus?: string | null;
  hasMember?: boolean;
  isAdmin?: boolean;
}): PersonStanding {
  const app = input.applicationStatus || "";
  const invite = input.inviteStatus || "";
  const account = input.accountStatus || "";
  if (app === "DECLINED" || app === "REJECTED" || account === "SUSPENDED" || account === "BANNED") {
    return { status: "DECLINED", stage: "DECLINED" };
  }
  const paymentDue = PAYMENT_DUE.has(input.paymentStatus || "") || app === "PAYMENT_DUE";
  const approvedApplication = app === "APPROVED" || app === "PAYMENT_DUE";
  const activeMember = Boolean(input.hasMember) && (account === "ACTIVE" || account === "");
  const openApplicantFile = Boolean(app) || invite === "PENDING" || invite === "ISSUED";
  // An active member stays Approved. A later open application does not demote them.
  // The administrator account is the operator. An open request on that same email stays Pending.
  const memberCountsAsApproved = activeMember && !(input.isAdmin && openApplicantFile && !approvedApplication);
  if (approvedApplication || memberCountsAsApproved) {
    return { status: "APPROVED", stage: paymentDue ? "PAYMENT_DUE" : "ACTIVE" };
  }
  if (invite === "DECLINED" && !app) return { status: "DECLINED", stage: "DECLINED" };
  if (app === "IN_REVIEW" || app === "NEEDS_INFO") return { status: "PENDING", stage: "IN_REVIEW" };
  if (app === "SUBMITTED" || app === "PENDING") return { status: "PENDING", stage: "APPLIED" };
  return { status: "PENDING", stage: "REQUESTED" };
}

/** Applications list: a file that is still waiting for a decision. */
export function isWaitingToBeChecked(standing: PersonStanding): boolean {
  return standing.status === "PENDING" && (standing.stage === "APPLIED" || standing.stage === "IN_REVIEW");
}

/** Members list: approved people only. */
export function isApprovedMember(standing: PersonStanding): boolean {
  return standing.status === "APPROVED";
}

/** Seed and test rows. A real address is not marked demo. */
export function isDemoRecord(input: { isTest?: boolean | null; email?: string | null }): boolean {
  if (input.isTest) return true;
  return (input.email || "").trim().toLowerCase().endsWith(".example");
}
