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

/** States with a manual secretary-of-state link. A city in one of these is not "outside the list". */
const FREE_REGISTRY_STATES = ["NJ", "NY", "DE", "FL", "TX", "DC", "CA", "IL", "MA", "WA", "GA", "PA", "CT", "MD", "CO", "VA"] as const;

const FREE_REGISTRY_NAMES: Record<string, (typeof FREE_REGISTRY_STATES)[number]> = {
  "new jersey": "NJ",
  "new york": "NY",
  delaware: "DE",
  florida: "FL",
  texas: "TX",
  "district of columbia": "DC",
  california: "CA",
  illinois: "IL",
  massachusetts: "MA",
  washington: "WA",
  georgia: "GA",
  pennsylvania: "PA",
  connecticut: "CT",
  maryland: "MD",
  colorado: "CO",
  virginia: "VA",
};

export const OUTSIDE_REGISTRY_TITLE = "Location is outside the free US registry list";

/** Abbreviation when the location is one of the states that has a registry link. */
export function freeRegistryState(location: string | null | undefined): string | null {
  const text = location || "";
  const abbr = text.toUpperCase().match(new RegExp(`\\b(${FREE_REGISTRY_STATES.join("|")})\\b`));
  if (abbr?.[1]) return abbr[1];
  const lower = text.toLowerCase();
  for (const [name, code] of Object.entries(FREE_REGISTRY_NAMES)) {
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
