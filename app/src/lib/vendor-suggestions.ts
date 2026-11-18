/**
 * Suggest a vendor. A member names a vendor they know (or a need they have). Suggestions are private: only the member
 * and staff see them. Staff approve with a referral code credited to the member; the vendor still applies and goes
 * through the same review and verification as everyone else.
 */
import { SEEK_CATEGORIES, isSeekCategory, seekLabel } from "@/lib/project-contact";
import { currentMonthlyCents, monthlyDuesCents } from "@/lib/dues";

export const SUGGESTION_STATUSES = ["IN_REVIEW", "LINK_SENT", "APPLIED", "VERIFIED", "DECLINED"] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export const STATUS_LABEL: Record<SuggestionStatus, string> = {
  IN_REVIEW: "In review",
  LINK_SENT: "Referral link sent",
  APPLIED: "Applied",
  VERIFIED: "Verified member",
  DECLINED: "Declined",
};

export const STATUS_TONE: Record<SuggestionStatus, string> = {
  IN_REVIEW: "bg-[#EFEAE0] text-mut",
  LINK_SENT: "border border-[#E9D9B0] bg-[#F6EEDB] text-[#7a5e25]",
  APPLIED: "bg-[#E3ECE6] text-[#2A4A3B]",
  VERIFIED: "bg-forest text-[#E9D9B0]",
  DECLINED: "bg-[#F3E1DC] text-[#8a3b2b]",
};

export const RELATIONS = ["WORKED", "RECOMMENDED", "LOOKING"] as const;
export type Relation = (typeof RELATIONS)[number];
export const RELATION_LABEL: Record<Relation, string> = {
  WORKED: "Worked with them",
  RECOMMENDED: "Recommended to me",
  LOOKING: "Looking for one",
};

export function suggestionCategories() {
  return SEEK_CATEGORIES.map((item) => ({ id: item.id, label: item.label }));
}

export function statusLabel(status: string): string {
  return STATUS_LABEL[status as SuggestionStatus] ?? STATUS_LABEL.IN_REVIEW;
}

export type SuggestionInput = {
  vendorName: string;
  company: string;
  category: string;
  location: string;
  website: string;
  contact: string;
  relation: string;
  note: string;
  nameOk: boolean;
};

export type CleanSuggestion = Omit<SuggestionInput, "relation"> & { relation: Relation };

const clip = (value: unknown, max: number) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);

/** Validates and trims a suggestion. "Looking for one" needs no vendor name; the others need a name or a company. */
export function validateSuggestion(input: Partial<SuggestionInput>): { ok: true; value: CleanSuggestion } | { ok: false; error: string } {
  const relation = (RELATIONS as readonly string[]).includes(String(input.relation)) ? (input.relation as Relation) : null;
  if (!relation) return { ok: false, error: "Choose how you know them." };
  const value: CleanSuggestion = {
    vendorName: clip(input.vendorName, 120),
    company: clip(input.company, 160),
    category: clip(input.category, 40),
    location: clip(input.location, 120),
    website: clip(input.website, 300),
    contact: clip(input.contact, 200),
    relation,
    note: String(input.note ?? "").trim().slice(0, 1500),
    nameOk: Boolean(input.nameOk),
  };
  if (!isSeekCategory(value.category)) return { ok: false, error: "Choose a category." };
  if (relation !== "LOOKING" && !value.vendorName && !value.company) return { ok: false, error: "Enter the vendor name or company." };
  if (!value.location) return { ok: false, error: "Enter the city and state." };
  if (value.website && !/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(value.website)) return { ok: false, error: "Enter a valid website." };
  return { ok: true, value };
}

/**
 * Status from the linked records. Declined stays declined. An approved application is a verified member; any other
 * application is Applied; a referral code alone is Referral link sent.
 */
export function deriveSuggestionStatus(input: {
  status: string;
  inviteCodeId: string | null;
  application: { status: string } | null;
}): SuggestionStatus {
  if (input.status === "DECLINED") return "DECLINED";
  if (input.status === "VERIFIED") return "VERIFIED";
  if (input.application) {
    if (input.application.status === "APPROVED") return "VERIFIED";
    if (input.application.status === "DECLINED" || input.application.status === "REJECTED") return "DECLINED";
    return "APPLIED";
  }
  if (input.inviteCodeId) return "LINK_SENT";
  return "IN_REVIEW";
}

/** A vendor becomes a paying member when their first dues payment is recorded (PAID, not waived or free). */
export function vendorIsPaying(vendor: { paymentStatus: string; paidAt: Date | null } | null): boolean {
  return Boolean(vendor && vendor.paymentStatus === "PAID" && vendor.paidAt);
}

/** One free month for a member who pays dues; recognition only (no money) for roles that pay $0. */
export function creditFor(member: { role: string; duesCents: number }): { cents: number; status: "AVAILABLE" | "RECOGNITION" } {
  if (monthlyDuesCents(member.role) <= 0) return { cents: 0, status: "RECOGNITION" };
  return { cents: currentMonthlyCents(member.role, member.duesCents), status: "AVAILABLE" };
}

/** Next dues charge after unapplied credits: each credit covers one full month. */
export function nextChargeAfterCredits(monthlyCents: number, credits: { status: string; cents: number }[]): { cents: number; creditCents: number } {
  const creditCents = credits.find((credit) => credit.status === "AVAILABLE")?.cents ?? 0;
  return { cents: Math.max(0, monthlyCents - creditCents), creditCents: Math.min(monthlyCents, creditCents) };
}

const STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico",
};

/** "Austin, TX" → "Texas". Without a comma the whole line is the area. */
export function demandArea(location: string): string {
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  if (!last) return "Unknown";
  const code = last.toUpperCase().replace(/[^A-Z]/g, "");
  if (STATES[code]) return STATES[code];
  const named = Object.values(STATES).find((name) => name.toLowerCase() === last.toLowerCase());
  return named ?? last;
}

/** Demand by category and area: every suggestion that was not declined counts as one request. */
export function demandByCategory(rows: { category: string; location: string; status: string }[]) {
  const counts = new Map<string, { category: string; label: string; area: string; count: number }>();
  for (const row of rows) {
    if (row.status === "DECLINED") continue;
    const area = demandArea(row.location);
    const key = `${row.category}|${area.toLowerCase()}`;
    const hit = counts.get(key) ?? { category: row.category, label: seekLabel(row.category), area, count: 0 };
    hit.count += 1;
    counts.set(key, hit);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

