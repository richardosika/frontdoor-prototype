import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/brand";
import {
  NDA_ACKNOWLEDGEMENT,
  canConnect,
  canRequestDealAccess,
  filterDeals,
  initialsFromName,
  isInviteUsable,
  matchScore,
  normalizeInviteCode,
  orderedPair,
  tierAfterCounterpartyConfirm,
  validateApplication,
} from "@/lib/domain";
import { ROLE_IDS, ROLES, roleLabel } from "@/lib/roles";

const BRIEF_LABELS = [
  "Developer",
  "Investor / Private Equity",
  "Family Office",
  "Lender / Debt Fund",
  "Mortgage Broker",
  "General Contractor",
  "Architect / Engineer",
  "Real Estate Attorney",
  "Securities Attorney",
  "Zoning / Land Use Attorney",
  "Insurance (builder's risk, title, surety / bonding)",
  "Broker",
  "Appraiser",
  "Property Manager",
  "Accountant / Cost Seg",
  "1031 Exchange Intermediary",
];

describe("brand", () => {
  it("uses the Private Floor name", () => {
    expect(BRAND.name).toBe("Private Floor");
    expect(BRAND.club).toBe("Private Floor Club");
    expect(BRAND.tagline).toBe("The vetted circle for real estate deal teams.");
    expect(NDA_ACKNOWLEDGEMENT).toContain(BRAND.club);
    expect(NDA_ACKNOWLEDGEMENT).not.toContain("FrontDoor");
    expect(NDA_ACKNOWLEDGEMENT).not.toContain("Cornicio");
  });
});

describe("roles", () => {
  it("lists the 16 deal-team roles from the brief", () => {
    expect(ROLES).toHaveLength(16);
    expect(ROLE_IDS).toHaveLength(16);
    expect(ROLES.map((role) => role.label)).toEqual(BRIEF_LABELS);
    expect(new Set(ROLES.map((role) => role.group)).size).toBeGreaterThan(1);
  });
});

describe("invites", () => {
  it("normalizes codes", () => {
    expect(normalizeInviteCode("  pf-7k2m-91qx ")).toBe("PF-7K2M-91QX");
  });

  it("rejects exhausted and expired codes", () => {
    expect(isInviteUsable({ uses: 0, maxUses: 3, expiresAt: null })).toBe(true);
    expect(isInviteUsable({ uses: 3, maxUses: 3, expiresAt: null })).toBe(false);
    expect(isInviteUsable({ uses: 0, maxUses: 3, expiresAt: new Date("2020-01-01") })).toBe(false);
  });
});

describe("deals", () => {
  const deals = [
    {
      title: "Newark multifamily",
      sponsorName: "Marcus Hale",
      sponsorRole: "DEVELOPER",
      roleNeeded: null,
      market: "NJ",
      sizeBand: "1-5",
      assetClass: "Multifamily",
    },
    {
      title: "Hoboken GC need",
      sponsorName: "Elena Voss",
      sponsorRole: "DEVELOPER",
      roleNeeded: "GENERAL_CONTRACTOR",
      market: "NJ",
      sizeBand: "5+",
      assetClass: "Mixed-use",
    },
    {
      title: "Brooklyn reuse",
      sponsorName: "Dana Whitfield",
      sponsorRole: "DEVELOPER",
      roleNeeded: null,
      market: "NY",
      sizeBand: "5+",
      assetClass: "Multifamily",
    },
  ];

  it("filters by role, market, size, and query", () => {
    expect(filterDeals(deals, { role: "GENERAL_CONTRACTOR" }).map((deal) => deal.title)).toEqual(["Hoboken GC need"]);
    expect(filterDeals(deals, { market: "NY" })).toHaveLength(1);
    expect(filterDeals(deals, { size: "5+" })).toHaveLength(2);
    expect(filterDeals(deals, { query: "marcus" })).toHaveLength(1);
    expect(filterDeals(deals, { role: "Any", market: "Any", size: "Any" })).toHaveLength(3);
  });

  it("scores a matching trade higher than an unrelated role", () => {
    const seeking = { kind: "SEEKING" as const, roleNeeded: "GENERAL_CONTRACTOR", sponsorRole: "DEVELOPER", market: "NJ" };
    const gc = matchScore({ memberRole: "GENERAL_CONTRACTOR", memberLocation: "Hoboken, NJ", deal: seeking });
    const broker = matchScore({ memberRole: "BROKER", memberLocation: "Miami, FL", deal: seeking });
    expect(gc).toBeGreaterThan(broker);
  });
});

describe("deal access", () => {
  it("requires an NDA acknowledgement and blocks duplicates", () => {
    expect(canRequestDealAccess({ isSponsor: false, ndaAcknowledged: false, existingStatus: null }).ok).toBe(false);
    expect(canRequestDealAccess({ isSponsor: true, ndaAcknowledged: true, existingStatus: null }).ok).toBe(false);
    expect(canRequestDealAccess({ isSponsor: false, ndaAcknowledged: true, existingStatus: "PENDING" }).ok).toBe(false);
    expect(canRequestDealAccess({ isSponsor: false, ndaAcknowledged: true, existingStatus: "APPROVED" }).ok).toBe(false);
    expect(canRequestDealAccess({ isSponsor: false, ndaAcknowledged: true, existingStatus: "REJECTED" }).ok).toBe(true);
    expect(canRequestDealAccess({ isSponsor: false, ndaAcknowledged: true, existingStatus: null }).ok).toBe(true);
  });
});

describe("network and verification", () => {
  it("orders conversation pairs and blocks self-connection", () => {
    expect(orderedPair("b", "a")).toEqual(["a", "b"]);
    expect(canConnect("user_a", "user_a").ok).toBe(false);
    expect(canConnect("user_a", "user_b").ok).toBe(true);
  });

  it("promotes a member to Confirmed after a counterparty vouch", () => {
    expect(tierAfterCounterpartyConfirm("INVITED")).toBe("CONFIRMED");
    expect(tierAfterCounterpartyConfirm("VERIFIED")).toBe("CONFIRMED");
    expect(tierAfterCounterpartyConfirm("CONFIRMED")).toBe("CONFIRMED");
  });

  it("validates applications", () => {
    expect(
      validateApplication({
        code: "PF-1",
        role: "DEVELOPER",
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "long-enough",
        org: "Analytical Engines",
        location: "Newark, NJ",
        credentialValue: "Entity 123",
        referenceEmails: ["ref@example.com"],
      }),
    ).toEqual([]);
    expect(validateApplication({
      code: "x",
      role: "NOPE",
      name: "A",
      email: "nope",
      password: "short",
      org: "",
      location: "",
      credentialValue: "",
      referenceEmails: [],
    }).length).toBeGreaterThan(3);
  });

  it("builds initials and role labels", () => {
    expect(initialsFromName("Marcus Hale")).toBe("MH");
    expect(roleLabel("LENDER")).toBe("Lender / Debt Fund");
  });
});
