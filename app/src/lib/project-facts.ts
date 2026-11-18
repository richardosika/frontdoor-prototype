import { formatProjectValue } from "@/lib/project-contact";
import { moneyDigits } from "@/lib/money";

/**
 * Overnight: optional project details a developer can add for the members a project seeks. Stored as JSON on
 * TrackProject.roleFacts. Each member type sees the facts that matter to them, first, on the Ledger and project page.
 * Nothing here is a financial term Private Floor invents: every value is what the developer typed.
 */
export const PROJECT_STAGES = [
  "Pre-development",
  "Entitlements",
  "Design",
  "Pre-construction",
  "Under construction",
  "Lease-up / stabilization",
  "Refinance / exit",
] as const;
export const DESIGN_STAGES = ["Concept", "Schematic design", "Design development", "Construction documents", "Permit set"] as const;

export type FactKey = "stage" | "units" | "loanAmount" | "ltcTarget" | "loanType" | "equityRaise" | "holdPeriod" | "scope" | "startDate" | "bidDue" | "designStage" | "need";
export type ProjectFacts = Partial<Record<FactKey, string>>;

export const FACT_FIELDS: { key: FactKey; label: string; kind: "text" | "money" | "number" | "stage" | "design" | "month" | "date"; hint?: string; max: number }[] = [
  { key: "stage", label: "Stage", kind: "stage", max: 40 },
  { key: "units", label: "Units", kind: "number", max: 6 },
  { key: "scope", label: "Scope of work", kind: "text", hint: "e.g. ground-up, 4 stories wood frame over podium", max: 200 },
  { key: "startDate", label: "Target start", kind: "month", max: 7 },
  { key: "bidDue", label: "Bids due", kind: "date", max: 10 },
  { key: "designStage", label: "Design stage", kind: "design", max: 40 },
  { key: "loanAmount", label: "Loan amount sought", kind: "money", max: 16 },
  { key: "ltcTarget", label: "Target LTC / LTV", kind: "text", hint: "As you would describe it, e.g. 65% LTC", max: 40 },
  { key: "loanType", label: "Loan type", kind: "text", hint: "e.g. construction, bridge, permanent", max: 60 },
  { key: "equityRaise", label: "Equity sought", kind: "money", max: 16 },
  { key: "holdPeriod", label: "Planned hold period", kind: "text", hint: "e.g. 5 to 7 years", max: 40 },
  { key: "need", label: "What you need from them", kind: "text", hint: "e.g. builder's risk quote, title commitment, Phase I", max: 200 },
];

/** Which facts each seek category sees first. Value (budget) and year come from the project itself. */
export const FACTS_BY_CATEGORY: Record<string, (FactKey | "value")[]> = {
  FINANCING: ["loanAmount", "ltcTarget", "loanType", "stage", "value"],
  EQUITY: ["equityRaise", "holdPeriod", "stage", "value"],
  DEVELOPMENT_PARTNER: ["stage", "units", "need", "value"],
  GENERAL_CONTRACTOR: ["scope", "value", "startDate", "bidDue", "units"],
  ARCHITECT_ENGINEER: ["units", "designStage", "startDate", "scope"],
  STRUCTURAL_ENGINEER: ["units", "designStage", "scope", "startDate"],
  CIVIL_ENGINEER: ["units", "designStage", "scope", "startDate"],
  MEP_ENGINEER: ["units", "designStage", "scope", "startDate"],
  GEOTECH_ENGINEER: ["stage", "scope", "startDate", "need"],
  RE_ATTORNEY: ["stage", "need", "value"],
  SECURITIES_ATTORNEY: ["stage", "need", "equityRaise"],
  ZONING_ATTORNEY: ["stage", "need", "units"],
  INSURANCE: ["stage", "need", "value", "startDate"],
  SURETY_BONDING: ["stage", "need", "value", "startDate"],
  TITLE_COMPANY: ["stage", "need", "value"],
  ENVIRONMENTAL_CONSULTANT: ["stage", "need", "startDate"],
  SURVEYOR: ["stage", "need", "startDate"],
  PERMIT_EXPEDITER: ["stage", "need", "startDate", "units"],
  BROKER: ["stage", "need", "value"],
  APPRAISER: ["stage", "value", "need"],
  PROPERTY_MANAGER: ["units", "stage", "need"],
  ACCOUNTANT: ["stage", "value", "need"],
  EXCHANGE_1031: ["stage", "value", "need"],
};

/** The securities caution shown wherever an equity raise is shown. */
export const EQUITY_CAUTION = "Member note only, not an offer to sell or a solicitation of an offer to buy securities.";

export function parseFacts(json: string | null | undefined): ProjectFacts {
  try {
    const raw = JSON.parse(json || "{}") as Record<string, unknown>;
    const out: ProjectFacts = {};
    for (const field of FACT_FIELDS) {
      const value = raw[field.key];
      if (typeof value === "string" && value.trim()) out[field.key] = value.trim().slice(0, field.max);
    }
    return out;
  } catch {
    return {};
  }
}

/** Read the optional fields from a form. Unknown stages are dropped; money is kept as digits. */
export function readFacts(form: { get(name: string): unknown }): ProjectFacts {
  const out: ProjectFacts = {};
  for (const field of FACT_FIELDS) {
    let value = String(form.get(`fact_${field.key}`) ?? "").trim().slice(0, field.max);
    if (!value) continue;
    if (field.kind === "money") value = moneyDigits(value);
    if (field.kind === "number") value = /^\d{1,5}$/.test(value) ? value : "";
    if (field.kind === "stage" && !(PROJECT_STAGES as readonly string[]).includes(value)) value = "";
    if (field.kind === "design" && !(DESIGN_STAGES as readonly string[]).includes(value)) value = "";
    if (field.kind === "month" && !/^\d{4}-\d{2}$/.test(value)) value = "";
    if (field.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) value = "";
    if (value) out[field.key] = value;
  }
  return out;
}

export function serializeFacts(facts: ProjectFacts): string {
  return JSON.stringify(facts);
}

function show(key: FactKey, value: string, locale: string): string {
  const field = FACT_FIELDS.find((item) => item.key === key);
  if (field?.kind === "money") return formatProjectValue(value);
  if (field?.kind === "month") {
    const [y, m] = value.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(locale, { month: "short", year: "numeric", timeZone: "UTC" });
  }
  if (field?.kind === "date") {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  return value;
}

/** The facts a member in `category` sees first, as label/value pairs, skipping blanks. */
export function factsFor(
  category: string | null,
  project: { roleFacts?: string | null; valueLabel: string },
  locale = "en",
  opts: { valueVisible?: boolean } = {},
): { key: string; label: string; value: string; translate: boolean }[] {
  const facts = parseFacts(project.roleFacts);
  const keys = (category && FACTS_BY_CATEGORY[category]) || ["stage", "units", "need", "value"];
  const out: { key: string; label: string; value: string; translate: boolean }[] = [];
  for (const key of keys) {
    if (key === "value") {
      if (opts.valueVisible !== false && project.valueLabel) out.push({ key, label: category === "GENERAL_CONTRACTOR" ? "Budget" : "Total project value", value: formatProjectValue(project.valueLabel), translate: false });
      continue;
    }
    const value = facts[key];
    if (!value) continue;
    const field = FACT_FIELDS.find((item) => item.key === key)!;
    out.push({ key, label: field.label, value: show(key, value, locale), translate: field.kind === "stage" || field.kind === "design" });
  }
  return out;
}

/** Every filled fact, for the owner and staff. */
export function allFacts(project: { roleFacts?: string | null }, locale = "en") {
  const facts = parseFacts(project.roleFacts);
  return FACT_FIELDS.filter((field) => facts[field.key]).map((field) => ({ key: field.key, label: field.label, value: show(field.key, facts[field.key]!, locale), translate: field.kind === "stage" || field.kind === "design" }));
}

/** Rank projects for a member: more of the facts they care about first, then newest. */
export function factScore(category: string | null, project: { roleFacts?: string | null; valueLabel: string }): number {
  return factsFor(category, project).length;
}
