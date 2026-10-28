import type { DirectoryPerson } from "@/lib/platform/directory";
import { rankBucket, searchDirectory } from "@/lib/platform/directory";

export const VENDOR_ROLES = [
  "GENERAL_CONTRACTOR",
  "BROKER",
  "MORTGAGE_BROKER",
  "RE_ATTORNEY",
  "SECURITIES_ATTORNEY",
  "ZONING_ATTORNEY",
  "INSURANCE",
  "ARCHITECT_ENGINEER",
  "ACCOUNTANT",
  "APPRAISER",
  "PROPERTY_MANAGER",
  "EXCHANGE_1031",
] as const;

export const LICENSE_KIND_LABELS: Record<string, string> = {
  CONTRACTOR: "Contractor",
  BAR_ADMISSION: "Bar admission",
  BROKER: "Broker",
  MORTGAGE_ORIGINATOR: "Mortgage originator",
  DESIGN_PROFESSIONAL: "Design professional",
  APPRAISER: "Appraiser",
  INSURANCE_PRODUCER: "Insurance producer",
  CPA: "CPA",
  FACILITY_OPERATOR: "Facility operator",
  OTHER: "Other",
};

export const AVAILABILITY_LABELS = {
  OPEN: "Open",
  SELECTIVE: "Selective",
  BOOKED: "Booked",
} as const;

const YEAR = 365 * 24 * 60 * 60 * 1000;

export function isVendorRole(role: string): boolean {
  return (VENDOR_ROLES as readonly string[]).includes(role);
}

export function licenceRecheckOn(verifiedAt: Date): Date {
  return new Date(verifiedAt.getTime() + YEAR);
}

export type LicenceRow = {
  kind: string;
  stateCode: string;
  scope: string;
  status: string;
  expiresOn: Date | null;
  verifiedAt: Date | null;
  recheckOn: Date | null;
  showOnProfile: boolean;
  number?: string;
  sourceUrl?: string;
};

export function licenceIsVerified(row: LicenceRow, now: Date): boolean {
  if (!row.showOnProfile || row.status !== "VERIFIED" || !row.verifiedAt) return false;
  if (row.expiresOn && row.expiresOn.getTime() <= now.getTime()) return false;
  if (row.recheckOn && row.recheckOn.getTime() <= now.getTime()) return false;
  return true;
}

export function licencePublicLabel(row: LicenceRow, now: Date): "Verified" | "Listed by member" | null {
  if (!row.showOnProfile) return null;
  if (row.status === "REJECTED" || row.status === "NOT_FOUND") return null;
  if (licenceIsVerified(row, now)) return "Verified";
  if (row.status === "SELF_REPORTED" || row.status === "UNDER_REVIEW" || row.status === "EXPIRED" || row.status === "VERIFIED") {
    return "Listed by member";
  }
  return null;
}

export function inVendorShowcase(input: { role: string; showcaseStatus: string; verified: boolean }): boolean {
  return isVendorRole(input.role) && input.showcaseStatus === "LISTED" && input.verified;
}

export function referenceDisplay(input: {
  status: string;
  reviewStatus: string;
  showName: boolean;
  counterpartyName: string;
}): { named: string | null; unnamed: boolean } {
  if (input.status !== "CONFIRMED" || input.reviewStatus !== "APPROVED") return { named: null, unnamed: false };
  if (input.showName && input.counterpartyName.trim()) return { named: input.counterpartyName.trim(), unnamed: false };
  return { named: null, unnamed: true };
}

export type PublicLicence = { kind: string; stateCode: string; scope: string; label: "Verified" | "Listed by member"; checkedOn: string | null };
export type PublicCredential = { kind: string; label: string; issuer: string; verifiedOn: string | null };
export type PublicProject = { name: string; location: string; year: number; asset: string; namedReferences: string[]; unnamedReferences: number };

export function publicLicences(rows: LicenceRow[], now: Date): PublicLicence[] {
  return rows.flatMap((row) => {
    const label = licencePublicLabel(row, now);
    if (!label) return [];
    return [
      {
        kind: LICENSE_KIND_LABELS[row.kind] || row.kind,
        stateCode: row.stateCode,
        scope: row.scope,
        label,
        checkedOn: label === "Verified" && row.verifiedAt ? row.verifiedAt.toISOString().slice(0, 10) : null,
      },
    ];
  });
}

export function publicCredentials(
  rows: { kind: string; label: string; issuer: string; verifiedAt: Date | null; visible: boolean; evidenceUrl?: string }[],
): PublicCredential[] {
  return rows
    .filter((row) => row.visible)
    .map((row) => ({
      kind: row.kind,
      label: row.label,
      issuer: row.issuer,
      verifiedOn: row.verifiedAt ? row.verifiedAt.toISOString().slice(0, 10) : null,
    }));
}

export function publicProjects(
  projects: {
    name: string;
    location: string;
    year: number;
    asset: string;
    inShowcase: boolean;
    confirmations: { status: string; reviewStatus: string; showName: boolean; counterpartyName: string }[];
  }[],
): PublicProject[] {
  return projects
    .filter((project) => project.inShowcase)
    .map((project) => {
      const refs = project.confirmations.map(referenceDisplay);
      return {
        name: project.name,
        location: project.location,
        year: project.year,
        asset: project.asset,
        namedReferences: refs.flatMap((item) => (item.named ? [item.named] : [])),
        unnamedReferences: refs.filter((item) => item.unnamed).length,
      };
    });
}

export type ShowcaseVendor = DirectoryPerson & {
  showcaseStatus: string;
  verified: boolean;
  availability: "OPEN" | "SELECTIVE" | "BOOKED";
  headline: string;
};

const AVAILABILITY_RANK = { OPEN: 30, SELECTIVE: 15, BOOKED: 0 };

export function showcaseResults(vendors: ShowcaseVendor[], filter: { role?: string; state?: string; metro?: string; asset?: string; specialty?: string }): ShowcaseVendor[] {
  const eligible = vendors.filter((vendor) => inVendorShowcase(vendor));
  const ranked = searchDirectory(eligible, {
    role: filter.role,
    state: filter.state,
    metro: filter.metro,
    asset: filter.asset,
    specialty: filter.specialty,
    sort: "match",
  });
  const byId = new Map(ranked.rows.map((row) => [row.id, row.rank]));
  return eligible
    .filter((vendor) => byId.has(vendor.id) || (!filter.state && !filter.metro && !filter.role && !filter.asset && !filter.specialty))
    .map((vendor) => ({ vendor, rank: (byId.get(vendor.id) ?? rankBucket(vendor, filter).rank) + AVAILABILITY_RANK[vendor.availability] }))
    .filter((item) => item.rank > 0 || (!filter.state && !filter.metro))
    .sort((a, b) => b.rank - a.rank || a.vendor.name.localeCompare(b.vendor.name))
    .map((item) => item.vendor);
}

export function vendorSearchHref(input: { role?: string | null; state?: string | null; asset?: string | null }): string {
  const params = new URLSearchParams();
  if (input.role) params.set("role", input.role);
  if (input.state && /^[A-Za-z]{2}$/.test(input.state)) params.set("state", input.state.toUpperCase());
  if (input.asset) params.set("assetClass", input.asset);
  const query = params.toString();
  return query ? `/vendors?${query}` : "/vendors";
}

export function findVendorLabel(role: string | null | undefined): string {
  if (!role || role === "GENERAL_CONTRACTOR") return "Find a GC";
  if (role === "BROKER" || role === "MORTGAGE_BROKER") return "Find a broker";
  if (role === "RE_ATTORNEY" || role === "SECURITIES_ATTORNEY" || role === "ZONING_ATTORNEY") return "Find an attorney";
  if (role === "ARCHITECT_ENGINEER") return "Find a designer";
  return "Find a vendor";
}
