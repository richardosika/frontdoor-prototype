import type { MemberRole } from "@prisma/client";

export const ASSET_CLASSES = ["Multifamily", "Condo", "Industrial", "Office", "Retail", "Mixed-use", "Hospitality", "Land", "Storage", "Other"] as const;

export const DEAL_TYPES = ["Equity", "Debt", "JV", "Sale", "Development", "Recapitalization", "Advisory"] as const;

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA",
  "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY",
] as const;

export const POST_INTENTS: { id: string; label: string; kind: "DEAL" | "SEEKING"; roles: MemberRole[] }[] = [
  { id: "raising-equity", label: "Developer raising equity", kind: "DEAL", roles: ["DEVELOPER"] },
  { id: "seeking-gc", label: "Developer seeking a general contractor", kind: "SEEKING", roles: ["DEVELOPER"] },
  { id: "seeking-debt", label: "Developer seeking debt", kind: "SEEKING", roles: ["DEVELOPER"] },
  { id: "gc-seeking-projects", label: "GC seeking projects", kind: "SEEKING", roles: ["GENERAL_CONTRACTOR"] },
  { id: "lender-offering-debt", label: "Lender offering debt", kind: "DEAL", roles: ["LENDER", "MORTGAGE_BROKER"] },
  { id: "lp-seeking-deals", label: "Investor or family office seeking deals", kind: "SEEKING", roles: ["INVESTOR_PE", "FAMILY_OFFICE"] },
  { id: "broker-seeking", label: "Broker seeking a counterparty", kind: "SEEKING", roles: ["BROKER"] },
  {
    id: "advisor-offering",
    label: "Attorney or advisor offering help",
    kind: "SEEKING",
    roles: ["RE_ATTORNEY", "SECURITIES_ATTORNEY", "ZONING_ATTORNEY", "INSURANCE", "ARCHITECT_ENGINEER", "ACCOUNTANT", "APPRAISER", "PROPERTY_MANAGER", "EXCHANGE_1031"],
  },
];

const FLAG_RULES: { term: string; pattern: RegExp }[] = [
  { term: "IRR", pattern: /\birr\b/i },
  { term: "guaranteed", pattern: /\bguaranteed\b/i },
  { term: "past performance", pattern: /\bpast performance\b/i },
  { term: "securities", pattern: /\bsecurit(?:y|ies)\b/i },
  { term: "accredited", pattern: /\baccredited\b/i },
  { term: "preferred return", pattern: /\bpreferred return\b/i },
  { term: "equity multiple", pattern: /\bequity multiple\b/i },
  { term: "a percent return", pattern: /\b\d+(?:\.\d+)?\s*%/ },
  { term: "offering memorandum", pattern: /\boffering memorandum\b|\bppm\b/i },
  { term: "subscription", pattern: /\bsubscription\b/i },
];

export const CHECKLIST = [
  { id: "profile", label: "Fill in your markets and what you are looking for or offering", href: "/profile" },
  { id: "directory", label: "Search the member directory", href: "/network" },
  { id: "guidelines", label: "Read the community guidelines", href: "/legal/guidelines" },
  { id: "post", label: "Post what you are seeking or raising", href: "/feed" },
  { id: "intro", label: "Request an introduction", href: "/network" },
] as const;

export type ChecklistId = (typeof CHECKLIST)[number]["id"];

export function intentsForRole(role: string) {
  return POST_INTENTS.filter((item) => (item.roles as readonly string[]).includes(role));
}

export function intentById(id: string) {
  return POST_INTENTS.find((item) => item.id === id) ?? null;
}

/** Returns the first banned phrase, or null when the text can publish. */
export function flagPostLanguage(text: string): string | null {
  for (const rule of FLAG_RULES) {
    if (rule.pattern.test(text)) return rule.term;
  }
  return null;
}

export function postNeedsRulesAck(kind: string): boolean {
  return kind === "DEAL" || kind === "SEEKING";
}

export function postIsPublic(input: {
  status: string;
  expiresAt?: Date | null;
  closedAt?: Date | null;
  now?: Date;
}): boolean {
  if (input.status !== "PUBLISHED") return false;
  if (input.closedAt) return false;
  if (input.expiresAt && input.expiresAt.getTime() <= (input.now ?? new Date()).getTime()) return false;
  return true;
}

export function checklistProgress(input: {
  markets: string;
  lookingFor: string;
  offering: string;
  postCount: number;
  introCount: number;
  manual: string;
}): { id: ChecklistId; label: string; href: string; done: boolean }[] {
  const manual = new Set(input.manual.split(",").map((item) => item.trim()).filter(Boolean));
  const auto: Record<ChecklistId, boolean> = {
    profile: input.markets.trim().length > 1 && (input.lookingFor.trim().length > 1 || input.offering.trim().length > 1),
    directory: manual.has("directory"),
    guidelines: manual.has("guidelines"),
    post: input.postCount > 0,
    intro: input.introCount > 0,
  };
  return CHECKLIST.map((item) => ({ ...item, done: auto[item.id] || manual.has(item.id) }));
}

export type DirectoryMember = {
  role: string;
  location: string;
  markets: string;
  dealTypes: string;
  assetClasses: string;
  name: string;
  org: string;
  bio: string;
};

export function directoryMatch(
  member: DirectoryMember,
  filter: { role?: string | null; state?: string | null; dealType?: string | null; assetClass?: string | null; q?: string | null },
): boolean {
  if (filter.role && member.role !== filter.role) return false;
  if (filter.state) {
    const state = filter.state.toUpperCase();
    const hay = `${member.location} ${member.markets}`.toUpperCase();
    if (!hay.includes(state)) return false;
  }
  if (filter.dealType && !member.dealTypes.toLowerCase().includes(filter.dealType.toLowerCase())) return false;
  if (filter.assetClass && !member.assetClasses.toLowerCase().includes(filter.assetClass.toLowerCase())) return false;
  const query = (filter.q ?? "").trim().toLowerCase();
  if (query) {
    const blob = `${member.name} ${member.org} ${member.bio} ${member.location}`.toLowerCase();
    if (!blob.includes(query)) return false;
  }
  return true;
}

export function canMessageAfterIntro(input: { intro: string | null; connection: string | null }): boolean {
  return input.intro === "ACCEPTED" || input.connection === "ACCEPTED";
}

export const DEAL_DOC_MAX_BYTES = 8 * 1024 * 1024;
const DOC_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

export function documentListEntry(input: { fileName: string; contentType: string; sizeBytes: number }): { ok: true } | { ok: false; error: string } {
  if (!input.fileName.trim()) return { ok: false, error: "Choose a file." };
  if (input.sizeBytes < 1) return { ok: false, error: "The file is empty." };
  if (input.sizeBytes > DEAL_DOC_MAX_BYTES) return { ok: false, error: "Files must be 8 MB or smaller. Only the name, type, and size are stored." };
  const type = input.contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  const normalized = type === "image/jpg" ? "image/jpeg" : type;
  if (!DOC_TYPES.has(normalized)) return { ok: false, error: "Upload a PDF, JPG, or PNG. Only the name, type, and size are stored." };
  return { ok: true };
}

export function memberBadgeLabel(verified: boolean): "Verified" | "Verification in progress" {
  return verified ? "Verified" : "Verification in progress";
}
