import { describe, expect, it } from "vitest";
import { closureLinks, slugsCoveredByFilter, THIN_MARKET_MIN } from "@/lib/platform/catalog";
import { planLocationBackfill } from "@/lib/platform/backfill";
import { dealSizeMatches, searchDirectory, type DirectoryPerson } from "@/lib/platform/directory";
import { stateFilterUsesBareContains } from "@/lib/platform/directory-query";
import { planSavedSearchAlerts, savedSearchNotice } from "@/lib/platform/alerts";
import { payloadProblems, scrubMemberPayload, verificationKeysArePublic } from "@/lib/platform/payload";
import { readProfileForm } from "@/lib/platform/profile-form";
import { PLATFORM_TEST_MEMBERS, rosterIsClearlyTest } from "@/lib/platform/roster";
import { bareStateContains, legacyPatternsMatch, legacyStatePatterns, stateCodesInText, textHasStateCode } from "@/lib/platform/state-codes";
import { fieldVisible } from "@/lib/platform/visibility";
import { PUBLIC_VERIFICATION_KEYS } from "@/lib/verification";

const now = new Date("2026-10-01T00:00:00Z");

function person(partial: Partial<DirectoryPerson> & Pick<DirectoryPerson, "id" | "name" | "role">): DirectoryPerson {
  return {
    initials: "TT",
    org: "TEST Org",
    bio: "",
    location: "",
    markets: "",
    dealTypes: "",
    assetClasses: "",
    checkSize: "",
    lookingFor: "",
    offering: "",
    nationwide: false,
    homeCity: "",
    homeState: "",
    homeMetro: "",
    operateStates: [],
    operateMetros: [],
    operateCounties: [],
    assetSlugs: [],
    specialtySlugs: [],
    verified: false,
    createdAt: now,
    completeness: 1,
    ...partial,
  };
}

describe("state filter accuracy", () => {
  const corpus: { location: string; markets: string; yes: string[]; no: string[] }[] = [
    { location: "Austin, TX", markets: "TX, CO", yes: ["TX", "CO"], no: ["IN", "CA", "IL"] },
    { location: "Chicago, IL", markets: "", yes: ["IL"], no: ["CA", "IN", "CO"] },
    { location: "Indianapolis, IN", markets: "", yes: ["IN"], no: ["IL", "CA"] },
    { location: "Indianapolis", markets: "", yes: [], no: ["IN"] },
    { location: "Indiana", markets: "", yes: ["IN"], no: ["IL"] },
    { location: "Kansas City, MO", markets: "", yes: ["MO"], no: ["KS", "CA"] },
    { location: "Washington, DC", markets: "", yes: ["DC"], no: ["WA", "IN"] },
    { location: "Seattle, WA", markets: "", yes: ["WA"], no: ["DC"] },
  ];

  it("matches postal codes and full names without substring hits", () => {
    for (const row of corpus) {
      for (const code of row.yes) expect(textHasStateCode(row.location, row.markets, code), `${row.location} ${code}`).toBe(true);
      for (const code of row.no) expect(textHasStateCode(row.location, row.markets, code), `${row.location} not ${code}`).toBe(false);
    }
    expect(stateCodesInText("Austin, TX")).not.toContain("IN");
    expect([...stateCodesInText("Chicago, IL")]).toEqual(["IL"]);
  });

  it("keeps database patterns aligned and never uses a bare two-letter contains", () => {
    for (const code of ["IN", "CA", "TX", "OR", "ID", "AL"]) {
      expect(bareStateContains(legacyStatePatterns(code), code)).toBe(false);
      expect(stateFilterUsesBareContains(code)).toBe(false);
    }
    for (const row of corpus) {
      for (const code of [...row.yes, ...row.no]) {
        expect(legacyPatternsMatch(row.location, row.markets, code)).toBe(textHasStateCode(row.location, row.markets, code));
      }
    }
  });
});

describe("markets, assets, and backfill", () => {
  it("links a state to its metros and counties", () => {
    const links = closureLinks();
    expect(links.some((link) => link.ancestorCode === "TX" && link.descendantCode === "19100")).toBe(true);
    expect(links.some((link) => link.ancestorCode === "19100" && link.descendantCode === "48085")).toBe(true);
    expect(links.some((link) => link.ancestorCode === "TX" && link.descendantCode === "48085")).toBe(true);
    expect(links.some((link) => link.ancestorCode === "NJ" && link.descendantCode === "34021" && link.ancestorKind === "STATE")).toBe(true);
    expect(links.some((link) => link.ancestorCode === "35620" && link.descendantCode === "34021")).toBe(false);
  });

  it("parses free-text home base into a metro and operating states", () => {
    const newark = planLocationBackfill({ location: "Newark, NJ", markets: "TX, CO" });
    expect(newark.homeCity).toBe("Newark");
    expect(newark.homeState).toBe("NJ");
    expect(newark.homeMetro).toBe("35620");
    expect(newark.nationwide).toBe(false);
    expect([...newark.operateStates].sort()).toEqual(["CO", "TX"]);
    const austin = planLocationBackfill({ location: "Austin, TX", markets: "" });
    expect(austin.homeMetro).toBe("12420");
    expect(planLocationBackfill({ location: "Chicago, IL", markets: "Nationwide" }).nationwide).toBe(true);
    expect(planLocationBackfill({ location: "Princeton, NJ", markets: "" }).homeMetro).toBe("45940");
  });

  it("includes subtypes when a group is selected and maps hospitality and storage", () => {
    expect(slugsCoveredByFilter("senior-housing")).toContain("memory-care");
    expect(slugsCoveredByFilter("memory-care")).toContain("senior-housing");
    expect(slugsCoveredByFilter("Hospitality")).toContain("select-service-hotel");
    expect(slugsCoveredByFilter("Storage")).toEqual(expect.arrayContaining(["self-storage", "conventional-storage"]));
  });
});

describe("directory ranking and thin markets", () => {
  const austin = person({
    id: "austin",
    name: "TEST Austin",
    role: "DEVELOPER",
    homeCity: "Austin",
    homeState: "TX",
    homeMetro: "12420",
    location: "Austin, TX",
    assetSlugs: ["select-service-hotel"],
    verified: true,
  });
  const dallas = person({
    id: "dallas",
    name: "TEST Dallas",
    role: "DEVELOPER",
    homeCity: "Dallas",
    homeState: "TX",
    homeMetro: "19100",
    location: "Dallas, TX",
    assetSlugs: ["multifamily"],
  });
  const statewide = person({
    id: "state",
    name: "TEST Statewide",
    role: "GENERAL_CONTRACTOR",
    homeCity: "Houston",
    homeState: "TX",
    homeMetro: "26420",
    operateStates: ["TX"],
    location: "Houston, TX",
    assetSlugs: ["self-storage"],
    specialtySlugs: ["storage-builder"],
  });
  const county = person({
    id: "county",
    name: "TEST County",
    role: "GENERAL_CONTRACTOR",
    homeState: "TX",
    operateCounties: ["48453"],
    location: "Travis County, TX",
  });
  const national = person({
    id: "national",
    name: "TEST National",
    role: "LENDER",
    homeCity: "Chicago",
    homeState: "IL",
    homeMetro: "16980",
    nationwide: true,
    location: "Chicago, IL",
    verified: true,
  });
  const phoenix = person({
    id: "phoenix",
    name: "TEST Phoenix",
    role: "GENERAL_CONTRACTOR",
    homeCity: "Phoenix",
    homeState: "AZ",
    homeMetro: "38060",
    location: "Phoenix, AZ",
  });

  it("ranks home, then works-in, then the same state, then nationwide", () => {
    const result = searchDirectory([national, dallas, austin, statewide], { metro: "12420", role: "DEVELOPER" });
    expect(result.rows.map((row) => row.id)).toEqual(["austin", "dallas"]);
    expect(result.rows[0]?.reason).toBe("Home base in Austin metro");
    expect(result.rows[1]?.reason).toBe("Home base in Texas");
    expect(result.showCount).toBe(false);
    expect(result.countLabel).toBe("Growing market");
    expect(result.widened).toBe("nationwide");
  });

  it("keeps a metro search inside the market once five members of that role are there", () => {
    const locals = [1, 2, 3, 4, 5].map((index) =>
      person({
        id: `gc-${index}`,
        name: `TEST GC ${index}`,
        role: "GENERAL_CONTRACTOR",
        homeMetro: "38060",
        homeState: "AZ",
        homeCity: "Phoenix",
        location: "Phoenix, AZ",
      }),
    );
    const tucson = person({
      id: "tucson",
      name: "TEST Tucson",
      role: "GENERAL_CONTRACTOR",
      homeCity: "Tucson",
      homeState: "AZ",
      homeMetro: "",
      location: "Tucson, AZ",
    });
    const result = searchDirectory([...locals, national, tucson], { metro: "38060", role: "GENERAL_CONTRACTOR" });
    expect(result.population).toBe(THIN_MARKET_MIN);
    expect(result.widened).toBe("none");
    expect(result.showCount).toBe(true);
    expect(result.countLabel).toBe("5 members");
    expect(result.banner).toBeNull();
    expect(result.rows.map((row) => row.id)).not.toContain("national");
    expect(result.rows.map((row) => row.id)).not.toContain("tucson");
  });

  it("widens a thin role and market to the state, then nationwide, and hides the count", () => {
    const traveling = person({
      id: "travel",
      name: "TEST Travel GC",
      role: "GENERAL_CONTRACTOR",
      homeCity: "Chicago",
      homeState: "IL",
      homeMetro: "16980",
      nationwide: true,
      location: "Chicago, IL",
    });
    const result = searchDirectory([phoenix, traveling, austin], { metro: "38060", role: "GENERAL_CONTRACTOR" });
    expect(result.population).toBe(1);
    expect(result.widened).toBe("nationwide");
    expect(result.countLabel).toBe("Growing market");
    expect(result.banner).toContain("Growing market");
    expect(result.rows.map((row) => row.id)).toEqual(["phoenix", "travel"]);
    expect(result.showCount).toBe(false);
  });

  it("finds a statewide row and a county inside the metro", () => {
    const result = searchDirectory([statewide, county, dallas], { metro: "12420", role: "GENERAL_CONTRACTOR" });
    expect(result.rows.map((row) => row.id)).toEqual(expect.arrayContaining(["state", "county"]));
    expect(result.rows.find((row) => row.id === "state")?.reason).toMatch(/Works in Texas/);
  });

  it("filters asset type, deal size, and specialty together", () => {
    const rows = searchDirectory([statewide, austin, phoenix], {
      asset: "self-storage",
      specialty: "storage-builder",
      size: "1-5",
    });
    expect(dealSizeMatches("1-5", "1-5")).toBe(true);
    expect(dealSizeMatches("$1–5M", "1-5")).toBe(true);
    expect(dealSizeMatches("Austin, TX", "1-5")).toBe(false);
    statewide.checkSize = "1-5";
    const filtered = searchDirectory([{ ...statewide, checkSize: "1-5" }, { ...austin, checkSize: "1-5" }], {
      asset: "Storage",
      specialty: "storage-builder",
      size: "1-5",
    });
    expect(filtered.rows.map((row) => row.id)).toEqual(["state"]);
    expect(rows.rows.length).toBe(0);
  });
});

describe("profile visibility, payload, and saved-search alerts", () => {
  it("hides a private field and a connections-only field from other members", () => {
    expect(fieldVisible({ audience: "MEMBERS", isSelf: false, connected: false })).toBe(true);
    expect(fieldVisible({ audience: "CONNECTIONS", isSelf: false, connected: false })).toBe(false);
    expect(fieldVisible({ audience: "CONNECTIONS", isSelf: false, connected: true })).toBe(true);
    expect(fieldVisible({ audience: "PRIVATE", isSelf: false, connected: true })).toBe(false);
    expect(fieldVisible({ audience: "PRIVATE", isSelf: true, connected: false })).toBe(true);
  });

  it("drops grade, score, email, and phone from a member payload", () => {
    const dirty = {
      name: "Ada",
      verification: { showBadge: true, verifiedOn: "2026-10-01", expiresOn: null, statusLine: null, grade: "A", score: 90 },
      email: "ada@example.com",
      phone: "555",
      nested: { internalNote: "secret", sources: ["web"] },
    };
    const clean = scrubMemberPayload(dirty);
    expect(payloadProblems(clean)).toEqual([]);
    expect(verificationKeysArePublic(clean.verification as Record<string, unknown>)).toBe(true);
    expect(Object.keys(clean.verification as object).sort()).toEqual([...PUBLIC_VERIFICATION_KEYS].sort());
    expect(JSON.stringify(clean)).not.toMatch(/grade|score|email|phone|internalNote|sources/i);
  });

  it("plans an outbox notice without a grade, a phone, or an email address", () => {
    const member = person({
      id: "new",
      name: "TEST New",
      role: "GENERAL_CONTRACTOR",
      org: "TEST Platform Storage Build",
      homeState: "AZ",
      homeMetro: "38060",
      homeCity: "Phoenix",
      location: "Phoenix, AZ",
      assetSlugs: ["self-storage"],
    });
    const notice = savedSearchNotice({
      filterName: "Phoenix GC",
      memberName: member.name,
      org: member.org,
      roleLabel: "General contractor",
      homeBase: "Phoenix, AZ",
      href: "/members/new",
    });
    expect(notice.subject).toContain("Phoenix GC");
    expect(notice.text).not.toMatch(/\bgrade\b|\bscore\b|@|\b\d{3}[-.\s]\d{3}/i);
    const planned = planSavedSearchAlerts({
      member,
      homeBase: "Phoenix, AZ",
      roleLabel: "General contractor",
      hrefFor: () => "/members/new",
      filters: [
        { id: "f1", userId: "other", name: "Phoenix GC", query: "role=GENERAL_CONTRACTOR&metro=38060", alreadySent: false },
        { id: "f2", userId: "other", name: "Dallas", query: "role=GENERAL_CONTRACTOR&metro=19100", alreadySent: false },
      ],
    });
    expect(planned.map((item) => item.filterId)).toEqual(["f1"]);
  });

  it("reads the structured profile form", () => {
    const data = new FormData();
    data.set("homeCity", "Austin");
    data.set("homeState", "tx");
    data.set("homeMetro", "12420");
    data.append("markets", "TX");
    data.append("markets", "NOPE");
    data.append("asset", "memory-care");
    data.set("stance", "DEVELOPS");
    data.append("specialty", "senior-living-operator");
    data.set("audienceCheckSize", "PRIVATE");
    data.set("nationwide", "on");
    const plan = readProfileForm(data, "DEVELOPER");
    expect(plan.homeState).toBe("TX");
    expect(plan.homeMetro).toBe("12420");
    expect(plan.operateStates).toEqual(["TX"]);
    expect(plan.assets).toEqual([{ slug: "memory-care", stance: "DEVELOPS" }]);
    expect(plan.specialties).toEqual(["senior-living-operator"]);
    expect(plan.audiences.checkSize).toBe("PRIVATE");
    expect(plan.nationwide).toBe(true);
  });
});

describe("TEST platform roster", () => {
  it("marks every QA member so cleanup can remove them", () => {
    expect(PLATFORM_TEST_MEMBERS.length).toBeGreaterThanOrEqual(7);
    expect(PLATFORM_TEST_MEMBERS.every(rosterIsClearlyTest)).toBe(true);
    const phoenixGc = PLATFORM_TEST_MEMBERS.filter((member) => member.role === "GENERAL_CONTRACTOR" && member.homeMetro === "38060");
    const dallasDevs = PLATFORM_TEST_MEMBERS.filter((member) => member.role === "DEVELOPER" && member.homeMetro === "19100");
    expect(phoenixGc).toHaveLength(1);
    expect(dallasDevs).toHaveLength(5);
    expect(PLATFORM_TEST_MEMBERS.some((member) => member.nationwide)).toBe(true);
  });
});
