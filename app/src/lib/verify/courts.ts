import { normalizeFirmName } from "@/lib/verify/edgar";
import { normalizeName } from "@/lib/verify/fuzzy";
import { parsePersonName } from "@/lib/verify/public-match";
import type { ApplicantFacts, CheckOutput } from "@/lib/verify/types";

const SEVERE = /\b(bankruptcy|fraud|indicted|ponzi)\b/i;

type CourtHit = { caseName: string; caseNameFull: string; snippet: string };

export function courtResults(payload: string): CourtHit[] | null {
  try {
    const parsed = JSON.parse(payload) as { results?: unknown };
    if (!parsed || !Array.isArray(parsed.results)) return null;
    return parsed.results.map((row) => {
      const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      return {
        caseName: String(record.caseName || record.case_name || ""),
        caseNameFull: String(record.caseNameFull || record.case_name_full || ""),
        snippet: String(record.snippet || record.suitNature || ""),
      };
    });
  } catch {
    return null;
  }
}

/** A caption word may sit in front of the name. Another given name may not, so "Douglas Richard Kennedy" is not Richard Kennedy. */
const CAPTION_WORD = new Set([
  "v", "vs", "aka", "and", "the", "of", "in", "re", "by", "for", "to", "a", "an",
  "appellant", "appellee", "plaintiff", "defendant", "petitioner", "respondent",
  "complainant", "state", "commonwealth", "people", "united", "states", "ex", "rel",
  "no", "case", "matter", "estate", "judge", "justice", "circuit", "court", "district",
  "et", "al", "jr", "sr", "ii", "iii", "iv", "md", "dr", "mr", "mrs", "ms", "hon",
]);

function escapeToken(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The words have to sit together. "Jeff" in one sentence and "Hines" in another is not the name. */
function containsPhrase(text: string, phrase: string): boolean {
  const parts = normalizeName(phrase).split(" ").filter((token) => token.length > 1);
  if (!parts.length) return false;
  if (parts.length === 1 && parts[0].length < 4) return false;
  const hay = normalizeName(text);
  const body = parts.map(escapeToken).join("\\s+");
  return new RegExp(`(?:^|\\s)${body}(?:\\s|$)`).test(hay);
}

function anchoredName(hay: string, body: string): boolean {
  if (new RegExp(`^${body}(?:\\s|$)`).test(hay)) return true;
  for (const match of hay.matchAll(new RegExp(`(?:^|\\s)(\\S+)\\s+${body}(?=\\s|$)`, "g"))) {
    const previous = match[1];
    if (previous.length < 3 || CAPTION_WORD.has(previous)) return true;
  }
  return false;
}

function personPhrase(text: string, name: string): boolean {
  const parsed = parsePersonName(name);
  if (!parsed || parsed.given.length < 1 || !parsed.surname) return false;
  const hay = normalizeName(text);
  const given = parsed.given.map((token) => escapeToken(token.toLowerCase())).join("\\s+");
  const surname = escapeToken(parsed.surname.toLowerCase());
  const initial = String.raw`(?:\s+[a-z])?`;
  const forward = `${given}${initial}\\s+${surname}`;
  const reversed = `${surname}\\s+${given}`;
  return anchoredName(hay, forward) || anchoredName(hay, reversed);
}

function companyPhrase(text: string, org: string): boolean {
  const phrase = normalizeFirmName(org);
  if (!phrase) return false;
  return containsPhrase(text, phrase);
}

function recordFields(result: CourtHit): string[] {
  return [result.caseName, result.caseNameFull, result.snippet].filter((field) => field.trim());
}

function courtRow(partial: Omit<CheckOutput, "ranAt" | "key" | "source" | "weight" | "url"> & { url?: string }): Omit<CheckOutput, "ranAt"> {
  const finding = partial.finding.includes("Not checkable for free.") ? partial.finding : `${partial.finding} Not checkable for free.`;
  return { ...partial, key: "courts", weight: 0, source: "CourtListener", url: partial.url || "", finding };
}

export function assessCourts(
  payload: string,
  http: { ok: boolean; status: number },
  facts: ApplicantFacts,
): Omit<CheckOutput, "ranAt"> {
  if (http.status === 401 || http.status === 403 || http.status === 0 || !http.ok) {
    return courtRow({
      status: "UNAVAILABLE",
      finding: "CourtListener was blocked, timed out, or did not respond. This source could not be checked.",
    });
  }
  const results = courtResults(payload);
  if (!results) {
    return courtRow({
      status: "INCONCLUSIVE",
      finding: "CourtListener responded, but the payload was not a result list. No keyword in that page was treated as a case.",
    });
  }
  let nameHits = 0;
  let severeNearName = 0;
  let corroborated = 0;
  let companyHits = 0;
  for (const result of results) {
    const fields = recordFields(result);
    const blob = fields.join(" ");
    const named = fields.some((field) => personPhrase(field, facts.name));
    const company = fields.some((field) => companyPhrase(field, facts.org));
    if (!named && !company) continue;
    if (named) nameHits += 1;
    else companyHits += 1;
    const severe = SEVERE.test(blob);
    if (!severe || !named) continue;
    severeNearName += 1;
    if (company) corroborated += 1;
  }
  if (corroborated > 0) {
    return courtRow({
      status: "INCONCLUSIVE",
      reviewFlag: true,
      finding: `Possible match, needs review. ${corroborated} CourtListener result(s) name this person and company near a severe term. This is not a failure and not an automatic decline.`,
    });
  }
  if (severeNearName > 0) {
    return courtRow({
      status: "INCONCLUSIVE",
      finding: `Possible match, needs review. A result mentions the full name near a severe term, without the company. A keyword elsewhere in the list was ignored. ${results.length} opinion(s) came back.`,
    });
  }
  if (nameHits > 0) {
    return courtRow({
      status: "INCONCLUSIVE",
      finding: `CourtListener returned ${results.length} opinion(s). ${nameHits} mention the full name and none pair it with the company and a severe term.`,
    });
  }
  if (companyHits > 0) {
    return courtRow({
      status: "INCONCLUSIVE",
      finding: `CourtListener returned ${results.length} opinion(s). ${companyHits} name the company as a phrase and do not name this person. Separate name words were not counted.`,
    });
  }
  return courtRow({
    status: "PASS",
    corroborates: false,
    finding: `No record found in CourtListener federal data (${results.length} opinion(s) came back). This is not a clearance of all litigation.`,
  });
}
