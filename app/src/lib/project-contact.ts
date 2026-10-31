/**
 * Project review and the contact rule.
 *
 * Every project names the categories it is seeking. A member may contact the owner about a project only when
 * that project is approved and seeks the member's category. An owner may reach out about their own project only
 * to members in a category the project seeks. A project seeking nothing cannot be contacted. Members already in
 * each other's circle can message without a project.
 */
import type { RoleId } from "@/lib/roles";

export type SeekCategory = { id: string; label: string; roles: RoleId[] };

/** What a project can seek, and which member roles answer each one. */
export const SEEK_CATEGORIES: SeekCategory[] = [
  { id: "FINANCING", label: "Financing (lenders, mortgage brokers)", roles: ["LENDER", "MORTGAGE_BROKER"] },
  { id: "EQUITY", label: "Equity (investors, LPs, family offices)", roles: ["INVESTOR_PE", "FAMILY_OFFICE"] },
  { id: "DEVELOPMENT_PARTNER", label: "Development partner", roles: ["DEVELOPER"] },
  { id: "GENERAL_CONTRACTOR", label: "General contractor", roles: ["GENERAL_CONTRACTOR"] },
  { id: "ARCHITECT_ENGINEER", label: "Architect / Engineer", roles: ["ARCHITECT_ENGINEER"] },
  { id: "RE_ATTORNEY", label: "Real estate attorney", roles: ["RE_ATTORNEY"] },
  { id: "SECURITIES_ATTORNEY", label: "Securities attorney", roles: ["SECURITIES_ATTORNEY"] },
  { id: "ZONING_ATTORNEY", label: "Zoning / land use attorney", roles: ["ZONING_ATTORNEY"] },
  { id: "INSURANCE", label: "Insurance / Surety", roles: ["INSURANCE"] },
  { id: "BROKER", label: "Broker", roles: ["BROKER"] },
  { id: "APPRAISER", label: "Appraiser", roles: ["APPRAISER"] },
  { id: "PROPERTY_MANAGER", label: "Property manager", roles: ["PROPERTY_MANAGER"] },
  { id: "ACCOUNTANT", label: "Accountant / Cost seg", roles: ["ACCOUNTANT"] },
  { id: "EXCHANGE_1031", label: "1031 exchange", roles: ["EXCHANGE_1031"] },
];

const BY_ID = new Map(SEEK_CATEGORIES.map((item) => [item.id, item]));

export function isSeekCategory(id: string): boolean {
  return BY_ID.has(id);
}

export function seekLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

/** The category a member answers, from their role. */
export function categoryForRole(role: string | null | undefined): string | null {
  if (!role) return null;
  return SEEK_CATEGORIES.find((item) => (item.roles as string[]).includes(role))?.id ?? null;
}

export function rolesForCategory(id: string): RoleId[] {
  return BY_ID.get(id)?.roles ?? [];
}

/** Known categories from a stored comma list, in catalog order, without duplicates. */
export function parseSeeking(value: string | string[] | null | undefined): string[] {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(",");
  const wanted = new Set(raw.map((item) => item.trim()).filter(Boolean));
  return SEEK_CATEGORIES.filter((item) => wanted.has(item.id)).map((item) => item.id);
}

export function serializeSeeking(value: string[]): string {
  return parseSeeking(value).join(",");
}

export function projectSeeksRole(project: { seeking: string }, role: string | null | undefined): boolean {
  const category = categoryForRole(role);
  return Boolean(category && parseSeeking(project.seeking).includes(category));
}

export type ContactProject = { userId: string; seeking: string; reviewStatus: string };
export type ContactParty = { id: string; role: string };

export type ContactDecision = { ok: true; category: string } | { ok: false; reason: string };

export const CONTACT_REASONS = {
  self: "You cannot contact yourself.",
  notApproved: "This project is not open yet. It is waiting for staff review.",
  seeksNothing: "This project is not seeking anyone right now, so it cannot be contacted.",
  notOwner: "Contact about a project goes to or comes from the project owner.",
  wrongCategory: "This project is not seeking your category. Private Floor does not allow cold outreach.",
  recipientCategory: "This project is not seeking that member's category.",
} as const;

/**
 * Whether `from` may send a contact request to `to` about `project`. One side must own the project and the
 * other side's role must be in a category the project seeks.
 */
export function canContactAboutProject(input: { project: ContactProject; from: ContactParty; to: ContactParty }): ContactDecision {
  const { project, from, to } = input;
  if (from.id === to.id) return { ok: false, reason: CONTACT_REASONS.self };
  if (project.reviewStatus !== "APPROVED") return { ok: false, reason: CONTACT_REASONS.notApproved };
  const seeking = parseSeeking(project.seeking);
  if (seeking.length === 0) return { ok: false, reason: CONTACT_REASONS.seeksNothing };
  const ownerSends = project.userId === from.id;
  const ownerReceives = project.userId === to.id;
  if (!ownerSends && !ownerReceives) return { ok: false, reason: CONTACT_REASONS.notOwner };
  const other = ownerSends ? to : from;
  const category = categoryForRole(other.role);
  if (!category || !seeking.includes(category)) {
    return { ok: false, reason: ownerSends ? CONTACT_REASONS.recipientCategory : CONTACT_REASONS.wrongCategory };
  }
  return { ok: true, category };
}

/**
 * Direct messages between two members. Allowed inside a circle, after an accepted introduction, after an
 * accepted project contact, or when a Private Floor administrator is on either side. Never with a block.
 */
export function canDirectMessage(input: {
  blocked: boolean;
  inCircle: boolean;
  introAccepted: boolean;
  contactAccepted: boolean;
  adminInvolved: boolean;
}): boolean {
  if (input.blocked) return false;
  return input.adminInvolved || input.inCircle || input.introAccepted || input.contactAccepted;
}

export const COLD_MESSAGE_REASON =
  "Messaging opens inside your circle or after a project contact is accepted. Private Floor does not allow cold outreach.";

export type ProjectReview = "PENDING_REVIEW" | "NEEDS_INFO" | "APPROVED" | "DECLINED";

export function reviewLabel(status: string): string {
  if (status === "PENDING_REVIEW") return "Pending review";
  if (status === "NEEDS_INFO") return "More info needed";
  if (status === "DECLINED") return "Declined";
  return "Approved";
}

/** Who sees a project. Owner and staff see every project; everyone else sees approved projects only. */
export function projectVisibleTo(project: { userId: string; reviewStatus: string }, viewer: { id: string; isAdmin: boolean }): boolean {
  return project.userId === viewer.id || viewer.isAdmin || project.reviewStatus === "APPROVED";
}

/**
 * Whether the viewer sees the project details (street, total value, notes). Owner and staff always do.
 * Circle members do when the owner shares the project with their circle.
 */
export function projectDetailsVisible(
  project: { userId: string; shareWithCircle: boolean; reviewStatus: string },
  viewer: { id: string; isAdmin: boolean; inOwnerCircle: boolean },
): boolean {
  if (project.userId === viewer.id || viewer.isAdmin) return true;
  return project.reviewStatus === "APPROVED" && project.shareWithCircle && viewer.inOwnerCircle;
}

/** Owners can edit a project that is waiting for review or that came back for more information. */
export function canEditProject(status: string): boolean {
  return status === "PENDING_REVIEW" || status === "NEEDS_INFO";
}

export type ReviewDecision = "APPROVE" | "NEEDS_INFO" | "DECLINE";

export function reviewOutcome(decision: string, note: string): { ok: true; status: ProjectReview; note: string } | { ok: false; reason: string } {
  const clean = note.trim().slice(0, 1000);
  if (decision === "APPROVE") return { ok: true, status: "APPROVED", note: clean };
  if (decision === "NEEDS_INFO") {
    if (clean.length < 3) return { ok: false, reason: "Write what information the member should add." };
    return { ok: true, status: "NEEDS_INFO", note: clean };
  }
  if (decision === "DECLINE") return { ok: true, status: "DECLINED", note: clean };
  return { ok: false, reason: "Choose Approve, More info needed, or Decline." };
}

/** Asset classes for a project, matching the Ledger list plus single family and self-storage. */
export const PROJECT_ASSET_CLASSES = [
  "Multifamily",
  "Single family / townhome",
  "Condo",
  "Mixed-use",
  "Office",
  "Retail",
  "Industrial",
  "Hospitality",
  "Self-storage",
  "Adaptive reuse",
  "Land",
  "Other",
] as const;

export const US_STATES: readonly (readonly [string, string])[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
  ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
  ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"],
  ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
  ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["PR", "Puerto Rico"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

export function isUsState(code: string): boolean {
  return US_STATES.some(([id]) => id === code);
}

export type ProjectInput = {
  name: string;
  asset: string;
  street: string;
  city: string;
  state: string;
  year: number;
  valueLabel: string;
  role: string;
  summary: string;
  seeking: string[];
  shareWithCircle: boolean;
};

/** Read and check the project form. Returns English problems for the banner. */
export function readProjectForm(form: { get(name: string): unknown; getAll(name: string): unknown[] }, roleLabels: string[]): { ok: true; value: ProjectInput } | { ok: false; reason: string } {
  const text = (key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);
  const value: ProjectInput = {
    name: text("name", 120),
    asset: text("asset", 60),
    street: text("street", 160),
    city: text("city", 80),
    state: text("state", 2).toUpperCase(),
    year: Number(form.get("year") || 0),
    valueLabel: text("valueLabel", 40),
    role: text("role", 60),
    summary: text("summary", 600),
    seeking: parseSeeking(form.getAll("seeking").map(String)),
    shareWithCircle: form.get("shareWithCircle") === "on",
  };
  if (value.name.length < 2) return { ok: false, reason: "Add the project name." };
  if (!(PROJECT_ASSET_CLASSES as readonly string[]).includes(value.asset)) return { ok: false, reason: "Choose an asset class." };
  if (!value.city) return { ok: false, reason: "Add the city." };
  if (!isUsState(value.state)) return { ok: false, reason: "Choose a state." };
  if (!Number.isInteger(value.year) || value.year < 1980 || value.year > 2100) return { ok: false, reason: "Add the year completed or expected." };
  if (!value.valueLabel) return { ok: false, reason: "Add the total project value." };
  if (!roleLabels.includes(value.role)) return { ok: false, reason: "Choose your role on the project." };
  return { ok: true, value };
}

export function projectLocation(input: { city: string; state: string }): string {
  return [input.city, input.state].filter(Boolean).join(", ");
}

/** Normalize a dollar entry: "24000000" becomes "$24,000,000"; text like "$24M" stays. */
export function formatProjectValue(value: string): string {
  const clean = value.trim();
  if (/^\d[\d,]*(\.\d+)?$/.test(clean)) {
    const number = Number(clean.replace(/,/g, ""));
    if (Number.isFinite(number)) return `$${number.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return clean;
}

/** Which categories a Ledger need answers. */
const NEED_CATEGORIES: Record<string, string[]> = {
  equity: ["EQUITY"],
  debt: ["FINANCING"],
  gc: ["GENERAL_CONTRACTOR"],
  broker: ["BROKER", "FINANCING"],
  advisory: ["RE_ATTORNEY", "SECURITIES_ATTORNEY", "ZONING_ATTORNEY", "ARCHITECT_ENGINEER", "INSURANCE", "ACCOUNTANT", "APPRAISER", "PROPERTY_MANAGER", "EXCHANGE_1031"],
};

/**
 * The categories a deal room is seeking: the linked project's list when there is one, plus the role the deal asked
 * for, plus its need (equity, debt, GC, broker, advisory).
 */
export function dealSeekingCategories(input: { need: string; roleNeeded: string | null; projectSeeking?: string | null }): string[] {
  const ids = new Set<string>(parseSeeking(input.projectSeeking ?? ""));
  const fromRole = categoryForRole(input.roleNeeded);
  if (fromRole) ids.add(fromRole);
  for (const id of NEED_CATEGORIES[input.need] ?? []) ids.add(id);
  return parseSeeking([...ids]);
}

export const DEAL_ROOM_REASON =
  "This deal room is not seeking your category. Access requests are open to members in the categories it seeks, and to the sponsor's circle and accepted contacts.";

/** Deal-room access follows the contact rule: a sought category, or an existing relationship (circle, accepted contact or introduction, administrator). */
export function canRequestDealRoom(input: { categories: string[]; requesterRole: string; related: boolean }): { ok: true } | { ok: false; reason: string } {
  if (input.related) return { ok: true };
  const category = categoryForRole(input.requesterRole);
  if (category && input.categories.includes(category)) return { ok: true };
  return { ok: false, reason: DEAL_ROOM_REASON };
}

/**
 * Everyone involved in a project, for document updates: the other side of each accepted project contact, circle
 * members when the project is shared with My Circle, and approved members of deal rooms linked to the project.
 * Never the owner; each person once.
 */
export function projectAudienceIds(input: {
  ownerId: string;
  acceptedContacts: { fromId: string; toId: string }[];
  shareWithCircle: boolean;
  circle: string[];
  dealMembers: string[];
}): string[] {
  const ids = new Set<string>();
  for (const row of input.acceptedContacts) ids.add(row.fromId === input.ownerId ? row.toId : row.fromId);
  if (input.shareWithCircle) for (const id of input.circle) ids.add(id);
  for (const id of input.dealMembers) ids.add(id);
  ids.delete(input.ownerId);
  return [...ids].sort();
}

export type DocumentChange = "added" | "replaced" | "removed";

/** Fix known misspellings in stored project roles (for example "Devloper"). Data is also corrected by migration. */
export function fixRoleTypos(role: string): string {
  return role.replace(/\bdevloper\b/gi, (m) => (m[0] === "d" ? "developer" : "Developer"));
}
