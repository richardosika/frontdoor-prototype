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

/** Every US state and DC. The outside-the-list line is for a location with none of these. */
const US_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD",
  "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

const US_STATE_NAMES: Record<string, (typeof US_STATE_CODES)[number]> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

const US_STATE_NAME_ENTRIES = Object.entries(US_STATE_NAMES).sort((left, right) => right[0].length - left[0].length);

function isStateCode(value: string): value is (typeof US_STATE_CODES)[number] {
  return (US_STATE_CODES as readonly string[]).includes(value);
}

export const OUTSIDE_REGISTRY_TITLE = "Location is outside the free US registry list";

/** US state or DC when the location names one. A foreign city returns null. */
export function freeRegistryState(location: string | null | undefined): string | null {
  const text = (location || "").replace(/\./g, "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const afterComma = text.match(/,\s*([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?\s*$/);
  if (afterComma?.[1] && isStateCode(afterComma[1].toUpperCase())) return afterComma[1].toUpperCase();
  const upperToken = text.match(/(?:^|\s)([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?\s*$/);
  if (upperToken?.[1] && isStateCode(upperToken[1])) return upperToken[1];
  const lower = text.toLowerCase();
  for (const [name, code] of US_STATE_NAME_ENTRIES) {
    if (lower.includes(name)) return code;
  }
  return null;
}

/** The approve-modal line. A listed state gets the registry note. Anywhere else keeps the outside-the-list line. */
export function registryNoteForLocation(location: string | null | undefined): string {
  const state = freeRegistryState(location);
  if (!state) return OUTSIDE_REGISTRY_TITLE;
  return `The state registry was not searched automatically. No free ${state} registry API. Open the ${state} secretary of state search.`;
}

export function approvalAttentionTitle(title: string, location: string | null | undefined): string {
  if (title.trim() !== OUTSIDE_REGISTRY_TITLE) return title;
  return registryNoteForLocation(location);
}

export function approvalAttentionDetail(title: string, detail: string, location: string | null | undefined): string {
  if (title.trim() !== OUTSIDE_REGISTRY_TITLE || !freeRegistryState(location)) return detail;
  return registryNoteForLocation(location);
}

const UNVERIFIED_STEP = new Set(["COULDNT_VERIFY", "NOT_CHECKED", "SKIPPED"]);

/** Titles grade.ts uses for a check that returned FAIL. Other attention titles are not hard failures. */
const FAILED_CHECK_TITLES = new Set([
  "Email syntax",
  "Disposable-email check",
  "Shared-inbox check",
  "Phone area code",
  "LinkedIn link",
  "Public LinkedIn page",
  "Duplicate check",
  "Sanctions check",
  "Write-up check",
  "Repeat-application check",
  "Name and company check",
  "Referral",
  "Social links",
  "Company website",
  "SEC EDGAR",
  "Domain registration",
  "Business card",
  "State business registry",
  "Public web search",
  "News search",
  "X",
  "Facebook",
  "Instagram",
  "YouTube",
  "TikTok",
  "Court search",
  "Address",
]);

const COULD_NOT_CHECK = /couldn'?t|could not|not checked|did not confirm|not a failure|was not searched|possible match|no free|optional|absence is not/i;

function unique(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(0, 12);
}

export function approvalItemLists(input: {
  steps?: { id?: string; title: string; status: string }[];
  attention?: { title: string; detail?: string }[];
}): { failed: string[]; unverified: string[] } {
  const failed: string[] = [];
  const unverified: string[] = [];
  for (const step of input.steps ?? []) {
    if (step.id === "decision") continue;
    if (step.status === "FAIL") failed.push(step.title);
    else if (UNVERIFIED_STEP.has(step.status)) unverified.push(step.title);
  }
  for (const item of input.attention ?? []) {
    const title = item.title.trim();
    if (!title) continue;
    const blob = `${title} ${item.detail || ""}`;
    if (FAILED_CHECK_TITLES.has(title) && !COULD_NOT_CHECK.test(blob)) failed.push(title);
    else unverified.push(title);
  }
  const failedItems = unique(failed);
  const failedSet = new Set(failedItems);
  return {
    failed: failedItems,
    unverified: unique(unverified).filter((item) => !failedSet.has(item)),
  };
}

export function unverifiedApprovalItems(input: {
  steps?: { id?: string; title: string; status: string }[];
  attention?: { title: string; detail?: string }[];
}): string[] {
  return approvalItemLists(input).unverified;
}

export function strongApprovalWarning(input: {
  letter: string;
  verdict: string;
  recommendation?: string;
  failed?: string[];
  unverified?: string[];
  items?: string[];
}): string {
  const grade = input.letter ? `Grade ${input.letter}` : "No letter grade";
  const verdict = input.verdict || input.recommendation || "no verdict";
  const failed = input.failed ?? [];
  const unverified = input.unverified ?? input.items ?? [];
  const failedText = failed.length ? ` Failed: ${failed.join("; ")}.` : "";
  const unverifiedText = unverified.length ? ` Unverified: ${unverified.join("; ")}.` : failed.length ? "" : " Unverified: none listed.";
  return `${grade}. Verdict: ${verdict}.${failedText}${unverifiedText} Approve this file anyway? This second confirmation is written to the audit log.`;
}
