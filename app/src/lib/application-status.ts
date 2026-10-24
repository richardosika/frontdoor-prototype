export const OPEN_APPLICATION_STATUSES = ["PENDING", "SUBMITTED", "IN_REVIEW", "NEEDS_INFO"] as const;
export const DECLINED_APPLICATION_STATUSES = ["REJECTED", "DECLINED"] as const;

export function applicationStatusLabel(status: string): string {
  if (status === "PENDING" || status === "SUBMITTED") return "Submitted";
  if (status === "IN_REVIEW") return "In review";
  if (status === "NEEDS_INFO") return "Needs more info";
  if (status === "APPROVED") return "Approved";
  if (status === "PAYMENT_DUE") return "Approved, payment due";
  if (status === "REJECTED" || status === "DECLINED") return "Declined";
  return status;
}

export function memberStatusCopy(status: string): { title: string; body: string } {
  if (status === "NEEDS_INFO") {
    return {
      title: "Needs more info",
      body: "Richard Osika needs a bit more before he can decide. Reply on this page. The reply stays inside the portal.",
    };
  }
  if (status === "APPROVED") {
    return {
      title: "You're an Invited member",
      body: "Richard Osika approved this application. Sign in with the email and password you chose. Your membership starts as Invited.",
    };
  }
  if (status === "PAYMENT_DUE") {
    return {
      title: "Approved, payment due",
      body: "Richard Osika approved this application. Sign in and pay the flat annual dues to open the floor. Nothing else is charged.",
    };
  }
  if (status === "REJECTED" || status === "DECLINED") {
    return {
      title: "Application not approved",
      body: "This application was not approved. Private Floor does not share the reasons.",
    };
  }
  return {
    title: "Application under review",
    body: "Verification in progress. Richard Osika reviews every application personally. This page updates when he decides.",
  };
}

export function verdictLabel(verdict: string | null | undefined): string {
  if (verdict === "LEGIT") return "Recommended legit";
  if (verdict === "NOT_LEGIT") return "Recommended not legit";
  if (verdict === "NEEDS_OWNER_DECISION") return "Needs your decision";
  return "Verification in progress";
}

export type ApplicationFilter =
  | "action"
  | "new"
  | "review"
  | "needs"
  | "legit"
  | "not"
  | "decision"
  | "approved"
  | "declined";

export const APPLICATION_FILTERS: { id: ApplicationFilter; label: string }[] = [
  { id: "action", label: "Needs action" },
  { id: "new", label: "New" },
  { id: "review", label: "In review" },
  { id: "needs", label: "Needs info" },
  { id: "legit", label: "Recommended legit" },
  { id: "not", label: "Recommended not legit" },
  { id: "decision", label: "Needs your decision" },
  { id: "approved", label: "Approved" },
  { id: "declined", label: "Declined" },
];

const TERMINAL = new Set(["APPROVED", "PAYMENT_DUE", "REJECTED", "DECLINED"]);

export function matchesApplicationFilter(
  filter: ApplicationFilter,
  status: string,
  verdict: string | null | undefined,
): boolean {
  if (filter === "action") return (OPEN_APPLICATION_STATUSES as readonly string[]).includes(status);
  if (filter === "new") return status === "PENDING" || status === "SUBMITTED";
  if (filter === "review") return status === "IN_REVIEW";
  if (filter === "needs") return status === "NEEDS_INFO";
  if (filter === "approved") return status === "APPROVED" || status === "PAYMENT_DUE";
  if (filter === "declined") return status === "REJECTED" || status === "DECLINED";
  if (TERMINAL.has(status)) return false;
  if (filter === "legit") return verdict === "LEGIT";
  if (filter === "not") return verdict === "NOT_LEGIT";
  return verdict === "NEEDS_OWNER_DECISION";
}
