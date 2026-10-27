import { normalizeFirmName } from "@/lib/verify/edgar";
import { normalizeName } from "@/lib/verify/fuzzy";
import { normalizeGenerationalSuffix } from "@/lib/verify/public-match";
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

/**
 * First and last name. A two-letter given name such as "QA" stays.
 * One token is not a full name, so "TestAF" alone is not searched and not a hit.
 */
export function courtNameParts(name: string): { given: string[]; surname: string } | null {
  const parts = name
    .split(/\s+/)
    .map((part) => part.replace(/^[^A-Za-z0-9-]+|[^A-Za-z0-9-]+$/g, ""))
    .filter((part) => part.replace(/[^A-Za-z0-9]/g, "").length >= 2);
  if (parts.length < 2) return null;
  let end = parts.length;
  if (normalizeGenerationalSuffix(parts[end - 1])) end -= 1;
  if (end < 2) return null;
  const surname = parts[end - 1];
  const given = parts.slice(0, end - 1);
  if (!given.length || !surname) return null;
  return { given, surname };
}

function courtSuffixLabel(name: string): string {
  const last = name.trim().split(/\s+/).pop() || "";
  const normalized = normalizeGenerationalSuffix(last);
  if (!normalized) return "";
  if (normalized === "jr") return "Jr.";
  if (normalized === "sr") return "Sr.";
  return normalized.toUpperCase();
}

/** Quoted "First Last", keeping Jr., Sr., or III so a different generation is not the query. */
export function courtSearchQuery(name: string): string {
  const parsed = courtNameParts(name);
  if (!parsed) return "";
  const suffix = courtSuffixLabel(name);
  const body = `${parsed.given.join(" ")} ${parsed.surname}`;
  return suffix ? `"${body} ${suffix}"` : `"${body}"`;
}

function personPhrase(text: string, name: string): boolean {
  const parsed = courtNameParts(name);
  if (!parsed) return false;
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
  const quoted = courtSearchQuery(facts.name);
  let nameHits = 0;
  let severeNearName = 0;
  let corroborated = 0;
  let companyHits = 0;
  let companyNamed = false;
  const matchedCases: string[] = [];
  const severeCases: string[] = [];
  for (const result of results) {
    const fields = recordFields(result);
    const blob = fields.join(" ");
    const named = Boolean(quoted) && fields.some((field) => personPhrase(field, facts.name));
    const company = fields.some((field) => companyPhrase(field, facts.org));
    if (!named && !company) continue;
    if (company) companyNamed = true;
    const label = (result.caseNameFull || result.caseName || result.snippet).replace(/\s+/g, " ").trim();
    if (named) {
      nameHits += 1;
      if (label && matchedCases.length < 3) matchedCases.push(label);
    } else companyHits += 1;
    const severe = SEVERE.test(blob);
    if (!severe || !named) continue;
    severeNearName += 1;
    if (label && severeCases.length < 3) severeCases.push(label);
    if (company) corroborated += 1;
  }
  const listed = (names: string[]) => names.map((name) => `"${name}"`).join("; ");
  const nameOnly = (count: number) => {
    const opinions = count === 1 ? "opinion names" : "opinions name";
    return `${count} ${opinions} a person with this name; none name the company. This is not a risk flag and not credit.`;
  };
  if (corroborated > 0) {
    return courtRow({
      status: "INCONCLUSIVE",
      reviewFlag: true,
      finding: `Possible match, needs review. Exact name match: ${listed(severeCases) || listed(matchedCases)}. ${corroborated} CourtListener result(s) name this person and company near a severe term. This is not a failure and not an automatic decline.`,
    });
  }
  if (nameHits > 0 && !companyNamed) {
    return courtRow({
      status: "INCONCLUSIVE",
      corroborates: false,
      finding: nameOnly(nameHits),
    });
  }
  if (severeNearName > 0) {
    return courtRow({
      status: "INCONCLUSIVE",
      finding: `Possible match, needs review. Exact name match: ${listed(severeCases) || listed(matchedCases)}. A result names the full name near a severe term, without the company. A single token was not counted.`,
    });
  }
  if (nameHits > 0) {
    return courtRow({
      status: "INCONCLUSIVE",
      corroborates: false,
      finding: `Exact name match: ${listed(matchedCases)}. ${nameHits} opinion(s) contain the quoted full name and none pair it with the company and a severe term. This is not credit.`,
    });
  }
  if (companyHits > 0) {
    return courtRow({
      status: "INCONCLUSIVE",
      corroborates: false,
      finding: `None found for this person. ${companyHits} name the company as a phrase and do not name this person. A single token was not counted. This is not a risk flag and not credit.`,
    });
  }
  return courtRow({
    status: "INCONCLUSIVE",
    corroborates: false,
    finding: "None found. No CourtListener opinion contains the exact full name (first and last, in quotes). This is not a risk flag and not credit. This is not a clearance of all litigation.",
  });
}
