import { nameTokens, normalizeName } from "@/lib/verify/fuzzy";
import type { ApplicantFacts, CheckOutput } from "@/lib/verify/types";

const SEVERE = /\b(bankruptcy|fraud|indicted|ponzi)\b/i;

type CourtHit = { caseName: string; snippet: string };

export function courtResults(payload: string): CourtHit[] | null {
  try {
    const parsed = JSON.parse(payload) as { results?: unknown };
    if (!parsed || !Array.isArray(parsed.results)) return null;
    return parsed.results.map((row) => {
      const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      return {
        caseName: String(record.caseName || record.case_name || ""),
        snippet: String(record.snippet || record.suitNature || ""),
      };
    });
  } catch {
    return null;
  }
}

function fullNameIn(text: string, name: string): boolean {
  const tokens = nameTokens(name);
  if (tokens.length < 2) return false;
  const hay = normalizeName(text);
  return tokens.every((token) => new RegExp(`\\b${token}\\b`).test(hay));
}

function companyIn(text: string, org: string): boolean {
  const phrase = normalizeName(org);
  if (phrase.length < 5) return false;
  return normalizeName(text).includes(phrase);
}

export function assessCourts(
  payload: string,
  http: { ok: boolean; status: number },
  facts: ApplicantFacts,
): Omit<CheckOutput, "ranAt"> {
  const base = {
    key: "courts",
    weight: 8,
    source: "CourtListener",
    url: "",
  };
  if (http.status === 401 || http.status === 403 || http.status === 0 || !http.ok) {
    return {
      ...base,
      status: "UNAVAILABLE",
      finding: "CourtListener was blocked, timed out, or did not respond. This source could not be checked.",
    };
  }
  const results = courtResults(payload);
  if (!results) {
    return {
      ...base,
      status: "INCONCLUSIVE",
      finding: "CourtListener responded, but the payload was not a result list. No keyword in that page was treated as a case.",
    };
  }
  let nameHits = 0;
  let severeNearName = 0;
  let corroborated = 0;
  for (const result of results) {
    const blob = `${result.caseName} ${result.snippet}`;
    const named = fullNameIn(result.caseName, facts.name) || fullNameIn(result.snippet, facts.name);
    if (!named) continue;
    nameHits += 1;
    const severe = SEVERE.test(blob);
    if (!severe) continue;
    severeNearName += 1;
    if (companyIn(blob, facts.org)) corroborated += 1;
  }
  if (corroborated > 0) {
    return {
      ...base,
      status: "INCONCLUSIVE",
      reviewFlag: true,
      finding: `Possible match, needs review. ${corroborated} CourtListener result(s) name this person and company near a severe term. This is not a failure and not an automatic decline.`,
    };
  }
  if (severeNearName > 0) {
    return {
      ...base,
      status: "INCONCLUSIVE",
      finding: `Possible match, needs review. A result mentions the full name near a severe term, without the company. A keyword elsewhere in the list was ignored. ${results.length} opinion(s) came back.`,
    };
  }
  if (nameHits > 0) {
    return {
      ...base,
      status: "INCONCLUSIVE",
      finding: `CourtListener returned ${results.length} opinion(s). ${nameHits} mention the full name and none pair it with the company and a severe term.`,
    };
  }
  return {
    ...base,
    status: "PASS",
    weight: 2,
    corroborates: false,
    finding: `No record found in CourtListener federal data (${results.length} opinion(s) came back). This is not a clearance of all litigation.`,
  };
}
