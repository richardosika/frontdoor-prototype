import type { VerificationStatus } from "@/lib/verification";

/** Membership tier and committee-file status for every seeded member. Confirmed only with an accepted vouch. */
export const SEEDED_MEMBER_FILES: Record<string, { tier: "INVITED" | "CONFIRMED"; status: VerificationStatus; expired?: boolean; note: string }> = {
  user_mh: { tier: "CONFIRMED", status: "VERIFIED", note: "File matches the public record. Accepted vouch is on Ironbound Lofts." },
  user_pa: { tier: "CONFIRMED", status: "VERIFIED", note: "File matches the public record. Accepted vouch is on Raritan Self Storage." },
  user_rk: { tier: "INVITED", status: "IN_REVIEW", note: "Identity matched. Business card and screen still open." },
  user_ev: { tier: "INVITED", status: "NEEDS_INFO", note: "Business card did not match the public record for this name." },
  user_ls: { tier: "INVITED", status: "IN_REVIEW", note: "Lender file is open. Membership stays Invited." },
  user_tn: { tier: "INVITED", status: "IN_REVIEW", note: "Investor file is open. Membership stays Invited." },
  user_dp: { tier: "INVITED", status: "IN_REVIEW", note: "Broker file is open. Membership stays Invited." },
  user_dw: { tier: "INVITED", status: "IN_REVIEW", note: "Sponsor file is open. Membership stays Invited." },
  user_hc: { tier: "INVITED", status: "IN_REVIEW", note: "Counsel file is open. Membership stays Invited." },
  user_sr: { tier: "INVITED", status: "IN_REVIEW", note: "No accepted vouch, so membership stays Invited." },
  user_jw: { tier: "INVITED", status: "IN_REVIEW", note: "Land-use file is open. Membership stays Invited." },
  user_gl: { tier: "INVITED", status: "VERIFIED", note: "Committee file is verified. Membership stays Invited until a vouch is accepted." },
  user_op: { tier: "INVITED", status: "IN_REVIEW", note: "Insurance file is open. Membership stays Invited." },
  user_mt: { tier: "INVITED", status: "IN_REVIEW", note: "Mortgage file is open. Membership stays Invited." },
  user_va: { tier: "INVITED", status: "IN_REVIEW", note: "Appraisal file is open. Membership stays Invited." },
  user_ns: { tier: "INVITED", status: "NOT_STARTED", note: "Membership is Invited. This file has not been started." },
  user_am: { tier: "INVITED", status: "VERIFIED", expired: true, note: "Prior file. Re-verify before treating the badge as current." },
  user_bk: { tier: "INVITED", status: "REJECTED", note: "Sanctions screen did not clear. Internal only." },
};

/** One case per seeded project. Names, owners, and cities are distinct. */
export const SEEDED_PROJECT_FILES: Record<string, { status: VerificationStatus; note: string }> = {
  proj_ironbound: { status: "VERIFIED", note: "Title, permits, and the accepted vouch are on file." },
  proj_halsey: { status: "VERIFIED", note: "Entitlements reviewed. The vouch is still waiting." },
  proj_nora: { status: "NOT_STARTED", note: "The vouch form stays hidden until an admin marks this project Verified." },
  proj_raritan: { status: "VERIFIED", note: "Stabilized storage. The accepted vouch is on file." },
  proj_waterfront: { status: "NOT_STARTED", note: "The vouch form stays hidden until an admin marks this project Verified." },
  proj_exchange: { status: "IN_REVIEW", note: "Adaptive reuse file is open." },
  proj_hoboken: { status: "NEEDS_INFO", note: "Public-record match did not line up for this project." },
  proj_parsippany: { status: "IN_REVIEW", note: "Warehouse file is open." },
};

export const SEEDED_EXTRA_PROJECTS = [
  {
    id: "proj_raritan",
    userId: "user_pa",
    name: "Raritan Self Storage",
    asset: "Storage",
    location: "Edison, NJ",
    year: 2024,
    valueLabel: "$18M",
    summary: "Stabilized self-storage. Sponsor.",
  },
  {
    id: "proj_waterfront",
    userId: "user_gl",
    name: "Paulus Hook Studio",
    asset: "Adaptive reuse",
    location: "Jersey City, NJ",
    year: 2022,
    valueLabel: "$6M",
    summary: "Architect of record.",
  },
  {
    id: "proj_exchange",
    userId: "user_dw",
    name: "Exchange Place Lofts",
    asset: "Multifamily",
    location: "Jersey City, NJ",
    year: 2021,
    valueLabel: "$41M",
    summary: "Sponsor.",
  },
  {
    id: "proj_hoboken",
    userId: "user_ev",
    name: "Washington Street Walk-ups",
    asset: "Mixed-use",
    location: "Hoboken, NJ",
    year: 2020,
    valueLabel: "$9M",
    summary: "General contractor.",
  },
  {
    id: "proj_parsippany",
    userId: "user_op",
    name: "Parsippany Bonded Warehouse",
    asset: "Industrial",
    location: "Parsippany, NJ",
    year: 2019,
    valueLabel: "$14M",
    summary: "Surety on the build.",
  },
] as const;

export function seededCaseCount(): number {
  return Object.keys(SEEDED_MEMBER_FILES).length + Object.keys(SEEDED_PROJECT_FILES).length;
}
