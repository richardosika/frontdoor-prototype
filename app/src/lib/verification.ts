export const VERIFICATION_STATUSES = [
  { id: "NOT_STARTED", label: "Not started" },
  { id: "IN_REVIEW", label: "In review" },
  { id: "NEEDS_INFO", label: "Needs info" },
  { id: "VERIFIED", label: "Verified" },
  { id: "REJECTED", label: "Rejected" },
  { id: "EXPIRED", label: "Expired" },
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]["id"];

export const CHECK_RESULTS = [
  { id: "PENDING", label: "Not reviewed" },
  { id: "PASS", label: "Pass" },
  { id: "FAIL", label: "Fail" },
  { id: "NEEDS_INFO", label: "Needs info" },
  { id: "NOT_PROVIDED", label: "Not provided" },
] as const;

export type CheckResult = (typeof CHECK_RESULTS)[number]["id"];

export const MEMBER_CHECKS = [
  { key: "identity", label: "Identity and LinkedIn match" },
  { key: "license", label: "Match business card to public records" },
  { key: "references", label: "References and vouches" },
  { key: "sanctions", label: "Sanctions, OFAC, and litigation screen" },
  { key: "track", label: "Track-record claims" },
] as const;

export const PROJECT_CHECKS = [
  { key: "sponsor", label: "Sponsor verified" },
  { key: "title", label: "Property ownership, title, or purchase contract" },
  { key: "entitlements", label: "Entitlements and permits" },
  { key: "capital", label: "Capital stack and sources" },
  { key: "budget", label: "Budget and GC bid" },
  { key: "track", label: "Prior-deal track record" },
] as const;

export const VOUCH_CHECK_KEY = "references";

/** An application with no named references leaves the vouch item Not provided. The case itself stays Not started. */
export function referenceCheckForApplication(input: { referenceEmails: string[]; speaker?: string }): {
  result: "PENDING" | "NOT_PROVIDED";
  note: string;
} {
  const emails = input.referenceEmails.map((item) => item.trim()).filter(Boolean);
  const speaker = (input.speaker ?? "").trim();
  if (!emails.length && !speaker) {
    return {
      result: "NOT_PROVIDED",
      note: "Not provided. The applicant did not name a reference. Reviewers check this internally.",
    };
  }
  const parts = ["Not started."];
  if (emails.length) parts.push(`Named emails: ${emails.join(", ")}.`);
  if (speaker) parts.push(`Anyone who can speak for them: ${speaker}`);
  parts.push("Reviewers check this internally.");
  return { result: "PENDING", note: parts.join(" ") };
}

export type PublicVerification = {
  showBadge: boolean;
  verifiedOn: string | null;
  expiresOn: string | null;
  statusLine: "Verification in progress" | null;
};

const AWAITING = new Set<VerificationStatus>(["NOT_STARTED", "IN_REVIEW", "NEEDS_INFO", "EXPIRED"]);

export function isVerificationStatus(value: string): value is VerificationStatus {
  return VERIFICATION_STATUSES.some((item) => item.id === value);
}

export function isCheckResult(value: string): value is CheckResult {
  return CHECK_RESULTS.some((item) => item.id === value);
}

export function verificationStatusLabel(status: string): string {
  return VERIFICATION_STATUSES.find((item) => item.id === status)?.label ?? status;
}

export function checkResultLabel(result: string): string {
  return CHECK_RESULTS.find((item) => item.id === result)?.label ?? result;
}

export function isVerificationPath(path: string): boolean {
  return (
    path === "/admin/verification" ||
    path.startsWith("/admin/verification/") ||
    path === "/api/admin/verification" ||
    path.startsWith("/api/admin/verification/")
  );
}

export function verificationDenial(input: {
  path: string;
  actor: { isAdmin: boolean } | null;
}): 403 | 404 | null {
  if (!isVerificationPath(input.path)) return null;
  if (input.actor?.isAdmin) return null;
  if (input.actor && input.path.startsWith("/api/admin/verification")) return 403;
  return 404;
}

export function gateVerificationRequest(input: {
  path: string;
  actor: { isAdmin: boolean } | null;
}): Response | null {
  const status = verificationDenial(input);
  if (status == null) return null;
  return new Response(status === 404 ? "Not found" : "Forbidden", {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export function effectiveVerificationStatus(
  input: { status: VerificationStatus; expiresAt: Date | null },
  now = new Date(),
): VerificationStatus {
  if (input.status === "VERIFIED" && input.expiresAt && input.expiresAt.getTime() <= now.getTime()) return "EXPIRED";
  return input.status;
}

export function checklistComplete(checks: { result: string }[]): boolean {
  return checks.length > 0 && checks.every((item) => item.result === "PASS");
}

export function canMarkCaseVerified(checks: { result: string }[]): { ok: true } | { ok: false; reason: string } {
  if (!checks.length) return { ok: false, reason: "The checklist is empty." };
  if (!checklistComplete(checks)) {
    return { ok: false, reason: "Every checklist item must pass before the case can be marked Verified." };
  }
  return { ok: true };
}

export function isAwaitingVerification(
  input: { status: VerificationStatus; expiresAt: Date | null },
  now = new Date(),
): boolean {
  return AWAITING.has(effectiveVerificationStatus(input, now));
}

export function toPublicVerification(
  input: {
    status: VerificationStatus;
    verifiedAt: Date | null;
    expiresAt: Date | null;
    checks: { result: string }[];
    internalNote?: string;
  } | null,
  now = new Date(),
): PublicVerification {
  if (!input) {
    return { showBadge: false, verifiedOn: null, expiresOn: null, statusLine: "Verification in progress" };
  }
  const status = effectiveVerificationStatus(input, now);
  if (status === "VERIFIED" && checklistComplete(input.checks) && input.verifiedAt) {
    return {
      showBadge: true,
      verifiedOn: input.verifiedAt.toISOString(),
      expiresOn: input.expiresAt ? input.expiresAt.toISOString() : null,
      statusLine: null,
    };
  }
  return { showBadge: false, verifiedOn: null, expiresOn: null, statusLine: "Verification in progress" };
}

export function canOpenProjectToCounterparties(view: PublicVerification): boolean {
  return view.showBadge;
}

export function canPromoteTierFromVouch(input: { adminReviewed: boolean }): boolean {
  return input.adminReviewed;
}

export function vouchEvidenceNote(input: { counterpartyName: string; projectName: string; note: string }): string {
  const extra = input.note.trim();
  return `${input.counterpartyName} confirmed work on ${input.projectName}.${extra ? ` ${extra}` : ""} Awaiting admin review before any tier change.`;
}

export const PUBLIC_VERIFICATION_KEYS = ["showBadge", "verifiedOn", "expiresOn", "statusLine"] as const;

export function committeeFileLabel(showBadge: boolean): string {
  return showBadge ? "Verified" : "Verification in progress";
}

export function verificationCaseHeading(input: {
  subject: string;
  user: { name: string; org?: string | null; location?: string | null } | null;
  project: { name: string; location?: string | null; year?: number | null; user?: { name: string } | null } | null;
}): { title: string; detail: string } {
  if (input.subject === "PROJECT") {
    const title = input.project?.name?.trim() || "Project";
    const owner = input.project?.user?.name?.trim() || "Owner";
    const city = input.project?.location?.trim() || "";
    const year = input.project?.year ? String(input.project.year) : "";
    return { title, detail: ["Project", owner, city, year].filter(Boolean).join(" · ") };
  }
  const title = input.user?.name?.trim() || "Member";
  const org = input.user?.org?.trim() || "";
  const city = input.user?.location?.trim() || "";
  return { title, detail: ["Member", org, city].filter(Boolean).join(" · ") };
}

export function verificationQueueLabel(input: {
  subject: string;
  user: { name: string; org?: string | null; location?: string | null } | null;
  project: { name: string; location?: string | null; year?: number | null; user?: { name: string } | null } | null;
}): string {
  if (input.subject === "PROJECT") {
    const name = input.project?.name?.trim() || "Project";
    const owner = input.project?.user?.name?.trim() || "Owner";
    const city = input.project?.location?.trim() || "";
    const year = input.project?.year ? String(input.project.year) : "";
    return [name, owner, city, year].filter(Boolean).join(" · ");
  }
  const name = input.user?.name?.trim() || "Member";
  const org = input.user?.org?.trim() || "";
  const city = input.user?.location?.trim() || "";
  return [name, org, city].filter(Boolean).join(" · ");
}
