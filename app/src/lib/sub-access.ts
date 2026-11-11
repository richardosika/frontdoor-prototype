/**
 * Nov 10 (Julia's minutes): who a subcontractor can reach.
 *
 * - Subs have direct access to general contractors and architects only: connection requests, new conversations,
 *   recommendations and project contact go only to them.
 * - Subs have no access to developers. Development Partners (developers) are one way: a developer can find and contact
 *   a sub (Find your team), but a sub cannot find, browse or contact a developer.
 * - These vendor categories are hidden from subs everywhere (directory, recommendations, profiles, suggestions):
 *   1031, Appraisers, Equity/LPs, Family Office, Financial Lenders, Real Estate Brokers, Securities Attorneys,
 *   Title Companies, Zoning & Land Attorneys.
 * - A sub who is also something else (a GC with Subcontractors as an extra category) is not restricted; only members
 *   whose membership type is Subcontractor are.
 * - Conversations a developer started with a sub stay open both ways, so the sub can answer.
 */
// No import from project-contact here: project-contact uses these rules, so this file stays dependency-free.
function extras(member: Member): string[] {
  return String(member.extraCategories ?? "").split(",").map((x) => x.trim()).filter(Boolean);
}

/** Membership types a subcontractor may contact directly. */
export const SUB_DIRECT_ROLES = ["GENERAL_CONTRACTOR", "ARCHITECT_ENGINEER"] as const;

/** Membership types hidden from subcontractors (developers plus Julia's nine vendor categories). */
export const SUB_HIDDEN_ROLES = [
  "DEVELOPER",
  "EXCHANGE_1031",
  "APPRAISER",
  "INVESTOR_PE",
  "FAMILY_OFFICE",
  "LENDER",
  "MORTGAGE_BROKER", // part of the Financing (Lenders) category
  "BROKER",
  "SECURITIES_ATTORNEY",
  "TITLE_COMPANY",
  "ZONING_ATTORNEY",
] as const;

/** Seek categories (project "seeking" ids) hidden from subs, e.g. in Suggest a vendor. */
export const SUB_HIDDEN_CATEGORIES = ["DEVELOPMENT_PARTNER", "EQUITY", "FINANCING", "EXCHANGE_1031", "APPRAISER", "BROKER", "SECURITIES_ATTORNEY", "TITLE_COMPANY", "ZONING_ATTORNEY"] as const;

type Member = { role: string | null | undefined; extraCategories?: string | null };

/** True when the member's membership type is Subcontractor (and they are not also a GC). */
export function isSubOnly(member: Member | null | undefined): boolean {
  if (!member || member.role !== "SUBCONTRACTOR") return false;
  return !extras(member).includes("GENERAL_CONTRACTOR");
}

/** Whether `viewer` may see `other` at all (directory, profile, recommendations). Non-subs see everyone. */
export function subCanSee(viewer: Member, other: Member): boolean {
  if (!isSubOnly(viewer)) return true;
  return !(SUB_HIDDEN_ROLES as readonly string[]).includes(String(other.role ?? ""));
}

/** Whether `viewer` may start contact with `other` (connect, new conversation, project contact). */
export function subCanReach(viewer: Member, other: Member): boolean {
  if (!isSubOnly(viewer)) return true;
  if ((SUB_DIRECT_ROLES as readonly string[]).includes(String(other.role ?? ""))) return true;
  const cats = extras(other);
  return cats.includes("GENERAL_CONTRACTOR") || cats.includes("ARCHITECT_ENGINEER");
}

/** Owners whose projects a member sees in Opportunities and the Ledger. Subs: GCs and architects; others: developers. */
export function opportunityOwnerRoles(viewer: Member): readonly string[] {
  return isSubOnly(viewer) ? SUB_DIRECT_ROLES : ["DEVELOPER"];
}

/** Whether a seek category is shown to this member (e.g. Suggest a vendor categories). */
export function categoryVisibleTo(viewer: Member, categoryId: string): boolean {
  if (!isSubOnly(viewer)) return true;
  return !(SUB_HIDDEN_CATEGORIES as readonly string[]).includes(categoryId);
}

export const SUB_REACH_REASON = "Subcontractors connect directly with general contractors and architects on Private Floor.";
