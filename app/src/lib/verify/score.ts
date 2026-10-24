import type { CheckOutput, ScoredReport, Verdict } from "@/lib/verify/types";

/**
 * Score is the share of weight earned by PASS checks.
 * NOT_RUN and UNAVAILABLE checks are left out. INCONCLUSIVE and FAIL earn nothing and stay in the denominator,
 * so a thin file cannot look strong. UNAVAILABLE means the source was blocked or timed out.
 * INCONCLUSIVE means the source responded and no matching data was found.
 * Thresholds are also described in app/docs/VERIFICATION.md.
 */
export const LEGIT_SCORE = 72;
export const CORROBORATION_WEIGHT = 8;
export const CORROBORATION_COUNT = 3;

export function scoreOf(checks: CheckOutput[]): number {
  const counted = checks.filter((check) => check.status !== "NOT_RUN" && check.status !== "UNAVAILABLE");
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
  const noData = checks.filter((check) => check.status === "INCONCLUSIVE").map((check) => check.key);
  const unavailable = checks.filter((check) => check.status === "UNAVAILABLE");
  const forLine = support.length ? `Strongest support: ${support.join(" ")}` : "Strongest support: no corroborating pass yet.";
  const againstLine = against.length ? `Strongest concern: ${against.join(" ")}` : "Strongest concern: no hard conflict in the checks that ran.";
  const noDataLine = noData.length
    ? `No data found: ${noData.slice(0, 8).join(", ")}.`
    : "No data found: the sources that responded had a result or a pass.";
  const unavailableText = unavailable.length
    ? unavailable
        .slice(0, 4)
        .map((check) => `${check.key}: ${check.finding}`)
        .join(" ")
    : "none of the free sources were blocked on this run";
  const free = `What I could not check for free: paid people-search, credit, full court dockets, logged-in LinkedIn, state registries that have no stable free API, and any source marked unavailable. ${unavailableText}`;
  return [opinion, forLine, againstLine, noDataLine, free].join(" ");
}

export function scoreReport(checks: CheckOutput[]): ScoredReport {
  const score = scoreOf(checks);
  const verdict = decideVerdict(checks, score);
  return { score, verdict, summary: buildSummary(checks, score, verdict), checks };
}
