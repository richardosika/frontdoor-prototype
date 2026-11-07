import { describe, expect, it } from "vitest";
import { recommend, recommendReasons, stateOf } from "@/lib/recommendations";
import { PHRASES } from "@/lib/i18n/phrases";
import { NETWORK_PHRASES } from "@/lib/i18n/network-phrases";

const dev = { id: "d", role: "DEVELOPER", location: "Austin, TX", markets: "Austin", assetClasses: "Multifamily", extraCategories: "", seeking: ["GENERAL_CONTRACTOR"] };

describe("recommended connections", () => {
  it("explains each match by location, category and project type", () => {
    expect(stateOf("Austin, TX")).toBe("TX");
    const gc = { id: "g", role: "GENERAL_CONTRACTOR", location: "Dallas, TX", markets: "", assetClasses: "Multifamily, Office", extraCategories: "" };
    expect(recommendReasons(dev, gc).map((r) => r.kind)).toEqual(["location", "category", "projectType"]);
  });
  it("ranks and filters weak matches and the circle", () => {
    const others = [
      { id: "g", role: "GENERAL_CONTRACTOR", location: "Dallas, TX", markets: "", assetClasses: "Multifamily", extraCategories: "" },
      { id: "x", role: "BROKER", location: "Miami, FL", markets: "", assetClasses: "Multifamily", extraCategories: "" },
      { id: "c", role: "GENERAL_CONTRACTOR", location: "Austin, TX", markets: "", assetClasses: "", extraCategories: "" },
    ];
    expect(recommend(dev, others, new Set(["c"])).map((r) => r.id)).toEqual(["g"]);
  });
  it("translates the new phrases", () => {
    for (const k of Object.keys(NETWORK_PHRASES)) expect(PHRASES[k]?.every((v) => v.length > 0), k).toBe(true);
  });
});

import { formatReason, isStaffAccount, reasonLine } from "@/lib/recommendations";

describe("recommendations: staff and specific reasons", () => {
  const base = { location: "Austin, TX", markets: "", assetClasses: "", extraCategories: "" };
  it("never recommends staff or admins, keeps company members", () => {
    const others = [
      { id: "a", role: "GENERAL_CONTRACTOR", ...base, isAdmin: true, email: "x@y.com" },
      { id: "r", role: "DEVELOPER", ...base, isAdmin: false, email: "Rich@PrivateFloorClub.com" },
      { id: "b", role: "GENERAL_CONTRACTOR", ...base, isAdmin: false, email: "ops@buildpro-cs.com" },
    ];
    expect(isStaffAccount({ email: "rich@privatefloorclub.com" })).toBe(true);
    expect(isStaffAccount({ email: "team@captiva.com" })).toBe(false);
    expect(recommend(dev, others, new Set()).map((r) => r.id)).toEqual(["b"]);
  });
  it("lender in TX matches a Houston project", () => {
    const viewer = { ...dev, location: "Austin, TX", projects: [{ name: "Bayou", asset: "Multifamily", city: "Houston", state: "TX", reviewStatus: "APPROVED", seeking: ["FINANCING"] }] };
    const lender = { id: "l", role: "LENDER", location: "Dallas, TX", markets: "", assetClasses: "", extraCategories: "" };
    const line = reasonLine(viewer, lender)!;
    expect(formatReason(line, (s) => s)).toBe("Lender & Debt Fund active in TX, matches your Houston project");
  });
  it("developer who builds multifamily in NJ, where the viewer has a project in review", () => {
    const viewer = { id: "v", role: "GENERAL_CONTRACTOR", location: "Miami, FL", markets: "", assetClasses: "", extraCategories: "", seeking: [], projects: [{ name: "Elm", asset: "Multifamily", city: "Newark", state: "NJ", reviewStatus: "PENDING_REVIEW", seeking: [] }] };
    const d = { id: "d2", role: "DEVELOPER", location: "Jersey City, NJ", markets: "", assetClasses: "Multifamily", extraCategories: "" };
    expect(formatReason(reasonLine(viewer, d)!, (s) => s)).toBe("Builds Multifamily in NJ, where you have a project in review");
  });
  it("open bid request in their category; no data means no reason", () => {
    const gc = { id: "g", role: "GENERAL_CONTRACTOR", location: "Miami, FL", markets: "", assetClasses: "", extraCategories: "", seeking: [] };
    const d = { id: "d", role: "DEVELOPER", location: "Austin, TX", markets: "", assetClasses: "", extraCategories: "", projects: [{ name: "Maple", asset: "Office", city: "Austin", state: "TX", reviewStatus: "APPROVED", seeking: [], bidCategories: ["GENERAL_CONTRACTOR"] }] };
    expect(formatReason(reasonLine(gc, d)!, (s) => s)).toBe("Open bid request in Austin for General Contractors");
    expect(reasonLine(gc, { ...d, projects: [], location: "Boston, MA" })).toBeNull();
  });
  it("translates placeholders", () => {
    const line = { key: "Also active in {place}", vars: { place: "TX" }, t: [] };
    expect(formatReason(line, (s) => PHRASES[s]?.[0] ?? s)).toBe("También activo en TX");
  });
});

describe("recommendations: staff by name", () => {
  it("leaves out another account under a staff member's name", () => {
    const others = [{ id: "ro", name: "Richard Osika", role: "DEVELOPER", location: "Austin, TX", markets: "", assetClasses: "", extraCategories: "", email: "r@captiva.example" }];
    expect(recommend(dev, others, new Set(), 6, new Set(["richard osika"]))).toEqual([]);
    expect(recommend(dev, [{ ...others[0], name: "Stephanie De La Torre", id: "s" }], new Set(), 6, new Set(["richard osika"])).length).toBe(1);
  });
  it("reads the city from a street address", () => {
    expect(cityOf("100 Test St, Houston, TX")).toBe("Houston");
  });
});
import { cityOf } from "@/lib/recommendations";
