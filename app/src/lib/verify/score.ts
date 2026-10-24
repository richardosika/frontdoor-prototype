import type { CheckOutput, ScoredReport, Verdict } from "@/lib/verify/types";

/**
 * Score is the share of weight earned by PASS checks.
 * NOT_RUN checks are left out. INCONCLUSIVE and FAIL earn nothing and stay in the denominator,
 * so a thin file cannot look strong.
 * Thresholds are also described in app/docs/VERIFICATION.md.
 */
export const LEGIT_SCORE = 72;
export const CORROBORATION_WEIGHT = 8;
export const CORROBORATION_COUNT = 3;

export function scoreOf(checks: CheckOutput[]): number {
  const counted = checks.filter((check) => check.status !== "NOT_RUN");
  const possible = counted.reduce((sum, check) => sum + Math.max(0, check.weight), 0);
  if (!possible) return 0;
  const earned = counted.filter((check) => check.status === "PASS").reduce((sum, check) => sum + check.weight, 0);
  return Math.round((100 * earned) / possible);
}

export function decideVerdict(checks: CheckOutput[], score: number): Verdict {
  if (checks.some((check) => check.hardFlag)) return "NOT_LEGIT";
  const corroboration = checks.filter((check) => check.status === "PASS" && check.corroborates && check.weight >= CORROBORATION_WEIGHT).length;
  const conflict = checks.some((check) => check.reviewFlag || check.status === "FAIL");
  if (score >= LEGIT_SCORE && corroboration >= CORROBORATION_COUNT && !conflict) return "LEGIT";
  return "NEEDS_OWNER_DECISION";
}

export function buildSummary(checks: CheckOutput[], score: number, verdict: Verdict): string {
  const label = verdict === "LEGIT" ? "LEGIT" : verdict === "NOT_LEGIT" ? "NOT LEGIT" : "NEEDS YOUR DECISION";
  const opinion =
    verdict === "LEGIT"
      ? `Recommendation: ${label}. Several independent checks line up on this person and company. The score is ${score} out of 100. This is a recommendation only. Richard Osika still approves every member.`
      : verdict === "NOT_LEGIT"
        ? `Recommendation: ${label}. A hard red flag is in the evidence. The score is ${score} out of 100. Do not treat this as an automatic decline. Richard Osika still decides.`
        : `Recommendation: ${label}. The file is thin or the checks conflict. The score is ${score} out of 100. Richard Osika should look at the items below before deciding.`;
  const support = checks.filter((check) => check.status === "PASS").slice(0, 2).map((check) => check.finding);
  const against = checks.filter((check) => check.hardFlag || check.reviewFlag || check.status === "FAIL").slice(0, 2).map((check) => check.finding);
  const missing = checks.filter((check) => check.status === "INCONCLUSIVE" || check.status === "NOT_RUN").map((check) => check.key);
  const forLine = support.length ? `Strongest support: ${support.join(" ")}` : "Strongest support: no corroborating pass yet.";
  const againstLine = against.length ? `Strongest concern: ${against.join(" ")}` : "Strongest concern: no hard conflict in the checks that ran.";
  const missingLine = missing.length
    ? `What is missing: ${missing.slice(0, 6).join(", ")}.`
    : "What is missing: the checks that ran all returned a result.";
  const free = "What I could not check for free: paid people-search, credit, full court dockets, logged-in LinkedIn, and state registries that have no stable free API.";
  return [opinion, forLine, againstLine, missingLine, free].join(" ");
}

export function scoreReport(checks: CheckOutput[]): ScoredReport {
  const score = scoreOf(checks);
  const verdict = decideVerdict(checks, score);
  return { score, verdict, summary: buildSummary(checks, score, verdict), checks };
}
