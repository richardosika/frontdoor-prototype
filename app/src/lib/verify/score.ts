import { gradeChecks, gradePlainText } from "@/lib/verify/grade";
import type { CheckOutput, ScoredReport, Verdict } from "@/lib/verify/types";

/**
 * Score is the share of weight earned by PASS checks.
 * NOT_RUN checks are left out, because the check was not attempted.
 * UNAVAILABLE, INCONCLUSIVE, and FAIL earn nothing and stay in the denominator,
 * so a thin file cannot look strong when sources are blocked.
 * UNAVAILABLE means the source was blocked or timed out.
 * INCONCLUSIVE means the source responded and no matching data was found.
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

/** Names of sources that were blocked, including providers listed inside a web-footprint finding. */
export function unavailableLabels(checks: CheckOutput[]): string[] {
  const names: string[] = [];
  const push = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !names.includes(trimmed)) names.push(trimmed);
  };
  for (const check of checks) {
    if (check.status === "UNAVAILABLE") push(check.key);
    const match = /Unavailable:\s*([^.]+)/i.exec(check.finding);
    if (!match) continue;
    for (const part of match[1].split(",")) push(part);
  }
  return names;
}

/** Legacy phrases the admin notice and older tests still look for. The page renders the structured grade instead. */
export function summaryTail(checks: CheckOutput[], verdict: Verdict): string {
  const label = verdict === "LEGIT" ? "LEGIT" : verdict === "NOT_LEGIT" ? "NOT LEGIT" : "NEEDS YOUR DECISION";
  const unavailable = unavailableLabels(checks);
  const unavailableText = unavailable.length
    ? `Unavailable sources: ${unavailable.join(", ")}.`
    : "none of the free sources were blocked on this run";
  return `Recommendation: ${label}. What I could not check for free: paid people-search, credit, full court dockets, logged-in LinkedIn, state registries that have no stable free API, and any source marked unavailable. ${unavailableText}`;
}

export function buildSummary(checks: CheckOutput[], _score: number, verdict: Verdict): string {
  const graded = gradeChecks(checks);
  return `${gradePlainText(graded)} ${summaryTail(checks, verdict)}`.replace(/\s+/g, " ").trim();
}

export function scoreReport(checks: CheckOutput[]): ScoredReport {
  const score = scoreOf(checks);
  const verdict = decideVerdict(checks, score);
  return { score, verdict, summary: buildSummary(checks, score, verdict), checks };
}
