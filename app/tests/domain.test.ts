import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/brand";
import {
  NDA_ACKNOWLEDGEMENT,
  canConnect,
  canRequestDealAccess,
  filterDeals,
  initialsFromName,
  isDollarRaise,
  isInviteUsable,
  isNonDollarSeeking,
  matchScore,
  normalizeInviteCode,
  orderedPair,
  storedSizeBand,
  tierAfterAdminApprovesVouch,
  tierAfterCounterpartyConfirm,
  marketToken,
  matchAudience,
  membershipTier,
  validateApplication,
} from "@/lib/domain";
import { membershipChipLabel, plural, tierLabel } from "@/lib/format";
import { SEEDED_MEMBER_FILES, SEEDED_PROJECT_FILES, seededCaseCount } from "@/lib/seed-coherence";
import { shouldDiscardInviteRequest, validateInviteRequest, INVITE_REQUESTS_PER_EMAIL_PER_DAY } from "@/lib/invite-request";
import { withinRateLimit } from "@/lib/messaging";
import { GENERIC_SIGN_IN_ERROR, INACTIVE_ACCOUNT_ERROR, PENDING_APPROVAL_ERROR, signInFailureCopy } from "@/lib/sign-in";
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

  it("keeps non-dollar seeking posts out of dollar size bands", () => {
    const seeking = {
      title: "Hoboken GC need",
      sponsorName: "Elena Voss",
      sponsorRole: "DEVELOPER",
      roleNeeded: "GENERAL_CONTRACTOR",
      market: "NJ",
      sizeBand: "5+",
      assetClass: "Mixed-use",
      kind: "SEEKING" as const,
      raiseLabel: "40k sf",
    };
    expect(isDollarRaise("$2.5M")).toBe(true);
    expect(isDollarRaise("40k sf")).toBe(false);
    expect(isDollarRaise("64 units")).toBe(false);
    expect(isDollarRaise("1 parcel")).toBe(false);
    expect(isNonDollarSeeking(seeking)).toBe(true);
    expect(storedSizeBand("SEEKING", "5+", "40k sf")).toBe("scope");
    expect(storedSizeBand("SEEKING", "1-5", "$3.2M")).toBe("1-5");
    expect(storedSizeBand("DEAL", "1-5", "$2.5M")).toBe("1-5");
    expect(filterDeals([seeking], { size: "5+" })).toHaveLength(0);
    expect(filterDeals([seeking], { size: "scope" })).toHaveLength(1);
    expect(filterDeals([seeking], {})).toHaveLength(1);
    const dollarSeeking = { ...seeking, raiseLabel: "$3.2M", sizeBand: "1-5" };
    expect(filterDeals([dollarSeeking], { size: "1-5" })).toHaveLength(1);
    expect(filterDeals([dollarSeeking], { size: "scope" })).toHaveLength(0);
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

  it("does not promote a member when a counterparty vouches", () => {
    expect(tierAfterCounterpartyConfirm("INVITED")).toBe("INVITED");
    expect(tierAfterCounterpartyConfirm("VERIFIED")).toBe("VERIFIED");
    expect(tierAfterCounterpartyConfirm("CONFIRMED")).toBe("CONFIRMED");
  });

  it("promotes to Confirmed only after an admin accepts the vouch", () => {
    expect(tierAfterAdminApprovesVouch("INVITED")).toBe("CONFIRMED");
    expect(tierAfterAdminApprovesVouch("VERIFIED")).toBe("CONFIRMED");
    expect(tierAfterAdminApprovesVouch("CONFIRMED")).toBe("CONFIRMED");
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
        referenceEmails: [],
      }),
    ).toEqual([]);
    expect(
      validateApplication({
        code: "PF-1",
        role: "DEVELOPER",
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "long-enough",
        org: "Analytical Engines",
        location: "Newark, NJ",
      }).some((error) => /reference/i.test(error)),
    ).toBe(false);
    expect(
      validateApplication({
        code: "PF-1",
        role: "DEVELOPER",
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "long-enough",
        org: "Analytical Engines",
        location: "Newark, NJ",
        referenceEmails: ["not-an-email"],
      }),
    ).toEqual(["Leave reference emails blank, or enter a valid email."]);
    expect(validateApplication({
      code: "x",
      role: "NOPE",
      name: "A",
      email: "nope",
      password: "short",
      org: "",
      location: "",
      referenceEmails: [],
    }).length).toBeGreaterThan(3);
  });

  it("accepts an invite request without an invite code and drops a honeypot", () => {
    expect(
      validateInviteRequest({
        name: "Chris Adeyemi",
        email: "chris@example.com",
        role: "LENDER",
        company: "Adeyemi Credit",
        city: "Jersey City, NJ",
        note: "Bridge lender",
      }),
    ).toEqual([]);
    expect(shouldDiscardInviteRequest("http://spam.example")).toBe(true);
    expect(shouldDiscardInviteRequest("")).toBe(false);
    expect(withinRateLimit(INVITE_REQUESTS_PER_EMAIL_PER_DAY, INVITE_REQUESTS_PER_EMAIL_PER_DAY)).toBe(false);
    expect(withinRateLimit(INVITE_REQUESTS_PER_EMAIL_PER_DAY - 1, INVITE_REQUESTS_PER_EMAIL_PER_DAY)).toBe(true);
  });

  it("keeps membership tier separate from the verified badge", () => {
    expect(membershipTier("VERIFIED")).toBe("INVITED");
    expect(membershipTier("CONFIRMED")).toBe("CONFIRMED");
    expect(tierLabel("VERIFIED")).toBe("Invited");
    expect(tierLabel("INVITED")).toBe("Invited");
    expect(tierLabel("CONFIRMED")).toBe("Confirmed");
    expect(membershipChipLabel("INVITED")).toBe("Membership · Invited");
    expect(membershipChipLabel("VERIFIED")).toBe("Membership · Invited");
    expect(matchAudience("GENERAL_CONTRACTOR").role).toBe("DEVELOPER");
    expect(matchAudience("DEVELOPER").role).toBe("INVESTOR_PE");
    expect(marketToken("Hoboken, NJ")).toBe("NJ");
    expect(plural(1, "investor")).toBe("1 investor");
    expect(seededCaseCount()).toBe(26);
    expect(Object.keys(SEEDED_MEMBER_FILES)).toHaveLength(18);
    expect(Object.keys(SEEDED_PROJECT_FILES)).toHaveLength(8);
    expect(SEEDED_MEMBER_FILES.user_ev).toMatchObject({ tier: "INVITED", status: "NEEDS_INFO" });
    expect(SEEDED_MEMBER_FILES.user_gl).toMatchObject({ tier: "INVITED", status: "VERIFIED" });
    expect(SEEDED_MEMBER_FILES.user_ns.status).toBe("NOT_STARTED");
    expect(SEEDED_MEMBER_FILES.user_ns.tier).toBe("INVITED");
    for (const file of Object.values(SEEDED_MEMBER_FILES)) {
      if (file.status === "NOT_STARTED") expect(file.tier).toBe("INVITED");
      if (file.tier === "CONFIRMED") expect(file.status).toBe("VERIFIED");
    }
    expect(plural(0, "investor")).toBe("0 investors");
    expect(ROLES.every((role) => !/licen[cs]e|nmls|bar id|id number/i.test(`${role.credentialLabel} ${role.credentialPlaceholder} ${role.check}`))).toBe(true);
  });

  it("mentions a pending application only after the password matches", () => {
    expect(
      signInFailureCopy({
        memberFound: false,
        memberPasswordMatches: false,
        memberActive: false,
        pendingApplicationPasswordMatches: true,
      }),
    ).toBe(PENDING_APPROVAL_ERROR);
    expect(
      signInFailureCopy({
        memberFound: false,
        memberPasswordMatches: false,
        memberActive: false,
        pendingApplicationPasswordMatches: false,
      }),
    ).toBe(GENERIC_SIGN_IN_ERROR);
    expect(
      signInFailureCopy({
        memberFound: true,
        memberPasswordMatches: false,
        memberActive: true,
        pendingApplicationPasswordMatches: true,
      }),
    ).toBe(GENERIC_SIGN_IN_ERROR);
    expect(
      signInFailureCopy({
        memberFound: true,
        memberPasswordMatches: true,
        memberActive: false,
        pendingApplicationPasswordMatches: false,
      }),
    ).toBe(INACTIVE_ACCOUNT_ERROR);
    expect(
      signInFailureCopy({
        memberFound: true,
        memberPasswordMatches: true,
        memberActive: true,
        pendingApplicationPasswordMatches: false,
      }),
    ).toBeNull();
  });

  it("builds initials and role labels", () => {
    expect(initialsFromName("Marcus Hale")).toBe("MH");
    expect(roleLabel("LENDER")).toBe("Lender / Debt Fund");
  });
});
