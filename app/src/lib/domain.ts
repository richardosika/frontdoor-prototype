import { BRAND } from "@/lib/brand";
import { isRoleId, ROLE_IDS, type RoleId } from "@/lib/roles";

/** Database enum still contains VERIFIED so existing rows can be migrated without dropping a value. */
export const TIERS = ["INVITED", "VERIFIED", "CONFIRMED"] as const;
export type Tier = (typeof TIERS)[number];

/** Membership shown in the product is Invited or Confirmed. The brass badge is a separate committee file. */
export const MEMBERSHIP_TIERS = ["INVITED", "CONFIRMED"] as const;
export type MembershipTier = (typeof MEMBERSHIP_TIERS)[number];

export function isMembershipTier(value: string): value is MembershipTier {
  return (MEMBERSHIP_TIERS as readonly string[]).includes(value);
}

export function membershipTier(tier: string): MembershipTier {
  return tier === "CONFIRMED" ? "CONFIRMED" : "INVITED";
}

export const MARKETS = ["NJ", "NY", "CT"] as const;

export const SIZE_BANDS = [
  { id: "under-1", label: "Under $1M" },
  { id: "1-5", label: "$1–5M" },
  { id: "5+", label: "$5M+" },
] as const;

export type SizeBand = (typeof SIZE_BANDS)[number]["id"];

/** Seeking posts whose size is square feet, units, or parcels, not a dollar raise. */
export const SCOPE_SIZE = "scope";

export const NDA_ACKNOWLEDGEMENT = `I acknowledge that materials in this deal room are confidential, that I will not share them outside the ${BRAND.club}, and that ${BRAND.name} does not offer securities, take subscriptions, or process payments.`;

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function isInviteUsable(
  invite: { uses: number; maxUses: number; expiresAt: Date | null },
  now = new Date(),
): boolean {
  if (invite.maxUses < 1) return false;
  if (invite.uses >= invite.maxUses) return false;
  if (invite.expiresAt && invite.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

export type DealFilterInput = {
  role?: string | null;
  market?: string | null;
  size?: string | null;
  query?: string | null;
};

export type FilterableDeal = {
  sponsorRole: string;
  roleNeeded: string | null;
  market: string;
  sizeBand: string;
  title: string;
  sponsorName: string;
  assetClass: string;
  kind?: "DEAL" | "SEEKING";
  raiseLabel?: string | null;
};

export function isDollarRaise(raiseLabel: string | null | undefined): boolean {
  const value = (raiseLabel ?? "").trim();
  if (!value) return false;
  if (/\b(sf|sq\.?\s*ft|square feet|units?|parcels?|acres?|keys|beds|lots?)\b/i.test(value)) return false;
  return /\$/.test(value) || /\b\d+(?:\.\d+)?\s*m\b/i.test(value);
}

export function isNonDollarSeeking(deal: FilterableDeal): boolean {
  if (deal.kind !== "SEEKING") return false;
  if (deal.sizeBand === SCOPE_SIZE) return true;
  return Boolean(deal.raiseLabel) && !isDollarRaise(deal.raiseLabel);
}

export function storedSizeBand(kind: "DEAL" | "SEEKING", sizeBand: string, raiseLabel: string): string {
  if (kind === "SEEKING" && !isDollarRaise(raiseLabel)) return SCOPE_SIZE;
  return sizeBand;
}

export function filterDeals<T extends FilterableDeal>(deals: T[], filter: DealFilterInput): T[] {
  const query = (filter.query ?? "").trim().toLowerCase();
  const role = filter.role && filter.role !== "Any" && filter.role !== "All" ? filter.role : null;
  const market = filter.market && filter.market !== "Any" ? filter.market : null;
  const size = filter.size && filter.size !== "Any" ? filter.size : null;

  return deals.filter((deal) => {
    if (role && deal.sponsorRole !== role && deal.roleNeeded !== role) return false;
    if (market && deal.market !== market) return false;
    if (size && !matchesSize(deal, size)) return false;
    if (query) {
      const haystack = `${deal.title} ${deal.sponsorName} ${deal.assetClass} ${deal.market}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function matchesSize(deal: FilterableDeal, size: string): boolean {
  if (isNonDollarSeeking(deal)) return size === SCOPE_SIZE;
  if (size === SCOPE_SIZE) return false;
  return deal.sizeBand === size;
}

export function sizeLabel(id: string | null | undefined): string {
  if (id === SCOPE_SIZE) return "Other scope";
  return SIZE_BANDS.find((band) => band.id === id)?.label ?? id ?? "";
}

export function isTier(value: string): value is Tier {
  return (TIERS as readonly string[]).includes(value);
}

/** A counterparty reply never changes tier. An arbitrary typed email cannot promote a member. */
export function tierAfterCounterpartyConfirm(current: Tier): Tier {
  return current;
}

/** Confirmed is only granted after an admin accepts the vouch. */
export function tierAfterAdminApprovesVouch(current: Tier): Tier {
  if (current === "CONFIRMED") return "CONFIRMED";
  return "CONFIRMED";
}

export type AccessState = "PENDING" | "APPROVED" | "REJECTED" | null;

export function canRequestDealAccess(input: {
  isSponsor: boolean;
  ndaAcknowledged: boolean;
  existingStatus: AccessState;
}): { ok: true } | { ok: false; reason: string } {
  if (input.isSponsor) return { ok: false, reason: "Sponsors already have access to their deal room." };
  if (input.existingStatus === "APPROVED") return { ok: false, reason: "You already have access." };
  if (input.existingStatus === "PENDING") return { ok: false, reason: "A request is already pending sponsor review." };
  if (!input.ndaAcknowledged) return { ok: false, reason: "NDA acknowledgement is required before you can request access." };
  return { ok: true };
}

export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function canConnect(fromId: string, toId: string): { ok: true } | { ok: false; reason: string } {
  if (!fromId || !toId) return { ok: false, reason: "Choose a member." };
  if (fromId === toId) return { ok: false, reason: "You cannot connect with yourself." };
  return { ok: true };
}

export type ApplicationInput = {
  code: string;
  role: string;
  name: string;
  email: string;
  password: string;
  org: string;
  location: string;
  referenceEmails?: string[];
  statement?: string;
  phone?: string;
  linkedinUrl?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateApplication(input: ApplicationInput): string[] {
  const errors: string[] = [];
  if (normalizeInviteCode(input.code).length < 4) errors.push("Enter the invite code a member shared with you.");
  if (!isRoleId(input.role)) errors.push("Pick the role that best describes you.");
  if (input.name.trim().length < 2) errors.push("Enter your name.");
  if (!EMAIL.test(input.email.trim())) errors.push("Enter a valid email.");
  if (input.password.length < 8) errors.push("Password must be at least 8 characters.");
  if (input.password.length > 72) errors.push("Password must be 72 characters or fewer.");
  if (input.org.trim().length < 2) errors.push("Enter your company or firm.");
  if (input.location.trim().length < 2) errors.push("Enter your city and state.");
  const refs = (input.referenceEmails ?? []).map((email) => email.trim()).filter(Boolean);
  if (refs.some((email) => !EMAIL.test(email))) {
    errors.push("Leave reference emails blank, or enter a valid email.");
  }
  if ((input.statement ?? "").length > 1000) errors.push("Keep the statement under 1000 characters.");
  const phone = (input.phone ?? "").trim();
  if (phone && phone.replace(/\D/g, "").length < 7) errors.push("Enter a phone number with at least 7 digits, or leave it blank.");
  const linkedin = (input.linkedinUrl ?? "").trim();
  if (linkedin && !/^https?:\/\//i.test(linkedin)) errors.push("LinkedIn URL must start with http.");
  return errors;
}

export function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "PF";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function roleIds(): readonly RoleId[] {
  return ROLE_IDS;
}

export function matchScore(input: {
  memberRole: string;
  memberLocation: string;
  deal: { kind: "DEAL" | "SEEKING"; roleNeeded: string | null; sponsorRole: string; market: string };
}): number {
  let score = 70;
  const market = marketFromLocation(input.memberLocation);
  if (market && market === input.deal.market) score += 12;
  if (input.deal.kind === "SEEKING" && input.deal.roleNeeded === input.memberRole) score += 14;
  if (input.deal.kind === "DEAL" && (input.memberRole === "INVESTOR_PE" || input.memberRole === "FAMILY_OFFICE" || input.memberRole === "LENDER")) {
    score += 10;
  }
  if (input.deal.sponsorRole === input.memberRole) score += 4;
  return Math.min(score, 99);
}

export function marketFromLocation(location: string): string | null {
  const upper = location.toUpperCase();
  if (upper.includes("NJ") || upper.includes("NEW JERSEY")) return "NJ";
  if (upper.includes("NY") || upper.includes("NEW YORK")) return "NY";
  if (upper.includes("CT") || upper.includes("CONNECTICUT")) return "CT";
  return null;
}
