import { verdictLabel } from "@/lib/application-status";
import { needsStrongApprovalWarning } from "@/lib/approval-warning";

/** The audit line written when an approval confirms a grade that is not a clean pass. */
export function strongApprovalAudit(input: {
  actorName: string;
  personName: string;
  email: string;
  letter?: string | null;
  verdict?: string | null;
  recommendation?: string | null;
}): { action: "APPROVE_NOT_LEGIT" | "APPROVE_DESPITE_GRADE"; summary: string; note: string } | null {
  const letter = input.letter || "";
  const verdict = input.verdict || "";
  const recommendation = input.recommendation || "";
  if (!needsStrongApprovalWarning({ letter, verdict, recommendation })) return null;
  const note = [
    letter === "F" ? "Approved despite grade F." : "",
    verdict === "NOT_LEGIT" ? "Approved despite recommendation NOT LEGIT." : "",
    recommendation === "DECLINE" ? "Approved despite recommendation DECLINE." : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    action: verdict === "NOT_LEGIT" ? "APPROVE_NOT_LEGIT" : "APPROVE_DESPITE_GRADE",
    summary: `${input.actorName} approved ${input.personName} (${input.email}) despite grade ${letter || "ungraded"}, ${verdict ? verdictLabel(verdict) : "no verdict"}, recommendation ${recommendation || "none"}.`,
    note,
  };
}
