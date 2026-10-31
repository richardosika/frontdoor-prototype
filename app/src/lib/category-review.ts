/**
 * #42 review: extra categories are reviewed by staff before they count. A member's picks split into categories
 * already approved (kept), and new ones (pending staff review). Only approved extras (User.extraCategories) are
 * used by matching, Find buttons, Opportunities, the Ledger, alerts, deal-room coverage and project access.
 */
import { categoryForRole, parseSeeking, serializeSeeking } from "@/lib/project-contact";

/** Categories that need a license, bond authority or bar admission checked against public records before approval. */
export const LICENSED_CATEGORIES = new Set([
  "FINANCING",
  "RE_ATTORNEY",
  "SECURITIES_ATTORNEY",
  "ZONING_ATTORNEY",
  "INSURANCE",
  "SURETY_BONDING",
  "BROKER",
  "APPRAISER",
  "ARCHITECT_ENGINEER",
  "GENERAL_CONTRACTOR",
  "SURVEYOR",
  "TITLE_COMPANY",
  "GEOTECH_ENGINEER",
  "CIVIL_ENGINEER",
  "STRUCTURAL_ENGINEER",
  "MEP_ENGINEER",
  "ACCOUNTANT",
]);

export function categoryNeedsCredentialCheck(id: string): boolean {
  return LICENSED_CATEGORIES.has(id);
}

/** What the member's ticked boxes mean: approved extras they kept, and new picks waiting for review. */
export function applyCategoryPicks(input: { role: string; approved: string; pending: string; picked: string[] }): { extraCategories: string; pendingCategories: string; added: string[] } {
  const primary = categoryForRole(input.role);
  const picked = parseSeeking(input.picked).filter((id) => id !== primary);
  const approved = parseSeeking(input.approved);
  const pending = parseSeeking(input.pending);
  const keep = picked.filter((id) => approved.includes(id));
  const waiting = picked.filter((id) => !approved.includes(id));
  return { extraCategories: serializeSeeking(keep), pendingCategories: serializeSeeking(waiting), added: waiting.filter((id) => !pending.includes(id)) };
}

/** Staff decision on one pending category. */
export function decideCategory(
  input: { approved: string; pending: string; category: string; decision: string; credentialChecked: boolean },
): { ok: true; extraCategories: string; pendingCategories: string; approved: boolean } | { ok: false; reason: string } {
  const pending = parseSeeking(input.pending);
  if (!pending.includes(input.category)) return { ok: false, reason: "That category is not waiting for review." };
  if (input.decision !== "approve" && input.decision !== "decline") return { ok: false, reason: "Choose approve or decline." };
  const approve = input.decision === "approve";
  if (approve && categoryNeedsCredentialCheck(input.category) && !input.credentialChecked) {
    return { ok: false, reason: "This category needs a license or credential check. Confirm you checked it before approving." };
  }
  const rest = pending.filter((id) => id !== input.category);
  const extra = approve ? serializeSeeking([...parseSeeking(input.approved), input.category]) : serializeSeeking(parseSeeking(input.approved));
  return { ok: true, extraCategories: extra, pendingCategories: serializeSeeking(rest), approved: approve };
}

export const CATEGORY_APPROVED_TITLE = "Category approved";
export const CATEGORY_DECLINED_TITLE = "Category not approved";
