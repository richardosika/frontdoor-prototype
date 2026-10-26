export function needsStrongApprovalWarning(input: {
  letter?: string | null;
  recommendation?: string | null;
  verdict?: string | null;
}): boolean {
  if (input.letter === "F") return true;
  if (input.verdict === "NOT_LEGIT") return true;
  if (input.recommendation === "DECLINE") return true;
  return false;
}

const UNVERIFIED_STEP = new Set(["COULDNT_VERIFY", "NOT_CHECKED", "SKIPPED", "FAIL"]);

export function unverifiedApprovalItems(input: {
  steps?: { id?: string; title: string; status: string }[];
  attention?: { title: string }[];
}): string[] {
  const fromSteps = (input.steps ?? [])
    .filter((step) => step.id !== "decision" && UNVERIFIED_STEP.has(step.status))
    .map((step) => step.title);
  const fromAttention = (input.attention ?? []).map((item) => item.title.trim()).filter(Boolean);
  return [...new Set([...fromSteps, ...fromAttention])].slice(0, 12);
}

export function strongApprovalWarning(input: {
  letter: string;
  verdict: string;
  recommendation?: string;
  items: string[];
}): string {
  const grade = input.letter ? `Grade ${input.letter}` : "No letter grade";
  const verdict = input.verdict || input.recommendation || "no verdict";
  const items = input.items.length ? input.items.join("; ") : "none listed";
  return `${grade}. Verdict: ${verdict}. Unverified: ${items}. Approve this file anyway? This second confirmation is written to the audit log.`;
}
