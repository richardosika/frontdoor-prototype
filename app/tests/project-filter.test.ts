import { describe, expect, it } from "vitest";
import type { FilterableDeal } from "@/lib/domain";
import {
  assetMatches,
  cleanProjectQuery,
  directoryNeedMatch,
  inferNeed,
  narrowProjects,
  parseProjectQuery,
  postedWithin,
  projectQuery,
  queryString,
  safeFilterQuery,
  settleProjectQuery,
  sortDirectory,
  sortProjects,
} from "@/lib/project-filter";

const now = new Date("2026-10-24T12:00:00Z");

function deal(partial: Partial<FilterableDeal> & { title: string } & Record<string, unknown>) {
  return {
    sponsorRole: "DEVELOPER",
    roleNeeded: null,
    market: "NJ",
    sizeBand: "1-5",
    sponsorName: "Marcus Hale",
    assetClass: "Multifamily",
    kind: "DEAL" as const,
    raiseLabel: "$2.5M",
    stage: "",
    need: "",
    intent: "",
    createdAt: new Date("2026-10-20T12:00:00Z"),
    ...partial,
  };
}

describe("project filters", () => {
  it("matches condo, mixed-use, and storage without hiding other stored classes", () => {
    expect(assetMatches("Condo", "Condo")).toBe(true);
    expect(assetMatches("Condominium", "Condo")).toBe(true);
    expect(assetMatches("Industrial", "Condo")).toBe(false);
    expect(assetMatches("mixed use", "Mixed-use")).toBe(true);
    expect(assetMatches("Storage", "Storage")).toBe(true);
    expect(assetMatches("Storage", "Multifamily")).toBe(false);
  });

  it("infers what is needed from a stored value, then intent, then role", () => {
    expect(inferNeed({ need: "debt", intent: "raising-equity" })).toBe("debt");
    expect(inferNeed({ intent: "raising-equity" })).toBe("equity");
    expect(inferNeed({ intent: "lp-seeking-deals" })).toBe("equity");
    expect(inferNeed({ intent: "seeking-debt" })).toBe("debt");
    expect(inferNeed({ intent: "lender-offering-debt" })).toBe("debt");
    expect(inferNeed({ intent: "seeking-gc" })).toBe("gc");
    expect(inferNeed({ intent: "gc-seeking-projects" })).toBe("gc");
    expect(inferNeed({ intent: "broker-seeking" })).toBe("broker");
    expect(inferNeed({ intent: "advisor-offering" })).toBe("advisory");
    expect(inferNeed({ roleNeeded: "GENERAL_CONTRACTOR" })).toBe("gc");
    expect(inferNeed({ roleNeeded: "ZONING_ATTORNEY" })).toBe("advisory");
    expect(inferNeed({})).toBe("");
  });

  it("keeps a blank stage in the list until a stage is chosen", () => {
    const rows = [
      deal({ title: "Blank stage" }),
      deal({ title: "Entitled", stage: "land", assetClass: "Land" }),
    ];
    expect(narrowProjects(rows, {}).map((row) => row.title)).toEqual(["Blank stage", "Entitled"]);
    expect(narrowProjects(rows, { stage: "land" }).map((row) => row.title)).toEqual(["Entitled"]);
  });

  it("filters asset, market, size, need, role, keyword, and posted date together", () => {
    const rows = [
      deal({ title: "Newark multifamily", need: "equity", assetClass: "Multifamily", market: "NJ" }),
      deal({
        title: "Hoboken GC need",
        kind: "SEEKING",
        sizeBand: "scope",
        raiseLabel: "40k sf",
        assetClass: "Mixed-use",
        roleNeeded: "GENERAL_CONTRACTOR",
        sponsorRole: "DEVELOPER",
      }),
      deal({
        title: "Old storage debt",
        assetClass: "Storage",
        need: "debt",
        createdAt: new Date("2026-06-01T12:00:00Z"),
      }),
      deal({ title: "Brooklyn equity", market: "NY", sizeBand: "5+", raiseLabel: "$9.5M", need: "equity" }),
    ];
    expect(narrowProjects(rows, { asset: "Multifamily", market: "NJ", need: "equity" }, now).map((row) => row.title)).toEqual([
      "Newark multifamily",
    ]);
    expect(narrowProjects(rows, { size: "5+" }, now)).toHaveLength(1);
    expect(narrowProjects(rows, { size: "scope" }, now).map((row) => row.title)).toEqual(["Hoboken GC need"]);
    expect(narrowProjects(rows, { role: "GENERAL_CONTRACTOR" }, now).map((row) => row.title)).toEqual(["Hoboken GC need"]);
    expect(narrowProjects(rows, { q: "storage" }, now).map((row) => row.title)).toEqual(["Old storage debt"]);
    expect(narrowProjects(rows, { posted: "30" }, now).map((row) => row.title)).not.toContain("Old storage debt");
    expect(narrowProjects(rows, { posted: "90" }, now).map((row) => row.title)).not.toContain("Old storage debt");
    expect(postedWithin(new Date("2026-10-20T12:00:00Z"), "7", now)).toBe(true);
    expect(postedWithin(new Date("2026-10-01T12:00:00Z"), "7", now)).toBe(false);
  });

  it("sorts newest, oldest, and match", () => {
    const rows = [
      deal({ title: "Mid", createdAt: new Date("2026-10-10T00:00:00Z"), match: 70 }),
      deal({ title: "New", createdAt: new Date("2026-10-22T00:00:00Z"), match: 60 }),
      deal({ title: "Old", createdAt: new Date("2026-09-01T00:00:00Z"), match: 90 }),
    ];
    expect(sortProjects(rows, "newest").map((row) => row.title)).toEqual(["New", "Mid", "Old"]);
    expect(sortProjects(rows, "oldest").map((row) => row.title)).toEqual(["Old", "Mid", "New"]);
    expect(sortProjects(rows, "match").map((row) => row.title)).toEqual(["Old", "Mid", "New"]);
  });

  it("round-trips a shareable URL and drops empty values", () => {
    const href = projectQuery("/deals", {
      role: "DEVELOPER",
      market: "TX",
      size: "5+",
      asset: "Condo",
      stage: "land",
      need: "equity",
      posted: "30",
      sort: "oldest",
      q: "austin",
    });
    const parsed = parseProjectQuery(Object.fromEntries(new URLSearchParams(href.split("?")[1])));
    expect(projectQuery("/deals", parsed)).toBe(href);
    expect(new URLSearchParams(href.split("?")[1]).get("size")).toBe("5+");
    expect(projectQuery("/deals", { role: "Any", market: "", q: "" })).toBe("/deals");
    expect(settleProjectQuery("/deals", { asset: "Multifamily", q: "", size: "" }, "deals").redirectTo).toBe("/deals?asset=Multifamily");
    expect(settleProjectQuery("/deals", { asset: "Multifamily" }, "deals").redirectTo).toBeNull();
    expect(settleProjectQuery("/deals", { sort: "newest" }, "deals").redirectTo).toBe("/deals");
    expect(queryString(cleanProjectQuery({ asset: "storage", market: "nj", sort: "newest" }, "deals"))).toBe("market=NJ&asset=Storage");
    expect(cleanProjectQuery({ assetClass: "Condo", state: "CA", dealType: "Equity", sort: "name" }, "network")).toEqual({
      state: "CA",
      assetClass: "Condo",
      dealType: "Equity",
    });
  });

  it("rejects saved-filter queries that are not filter strings", () => {
    expect(safeFilterQuery("")).toBe("");
    expect(safeFilterQuery("asset=Condo&role=DEVELOPER&drop=1")).toBe("role=DEVELOPER&asset=Condo");
    expect(safeFilterQuery("https://evil.example/deals")).toBeNull();
    expect(safeFilterQuery("../admin")).toBeNull();
    expect(safeFilterQuery("/deals?asset=Condo")).toBeNull();
  });

  it("matches directory need and sort", () => {
    expect(directoryNeedMatch({ role: "DEVELOPER", dealTypes: "Equity", lookingFor: "" }, "equity")).toBe(true);
    expect(directoryNeedMatch({ role: "DEVELOPER", dealTypes: "Sale", lookingFor: "" }, "equity")).toBe(false);
    expect(directoryNeedMatch({ role: "GENERAL_CONTRACTOR", dealTypes: "", lookingFor: "" }, "gc")).toBe(true);
    expect(directoryNeedMatch({ role: "ZONING_ATTORNEY", dealTypes: "", offering: "" }, "advisory")).toBe(true);
    const people = [
      { name: "Dana", createdAt: new Date("2026-01-01") },
      { name: "Gabe", createdAt: new Date("2026-08-01") },
    ];
    expect(sortDirectory(people, "name").map((person) => person.name)).toEqual(["Dana", "Gabe"]);
    expect(sortDirectory(people, "newest").map((person) => person.name)).toEqual(["Gabe", "Dana"]);
  });
});
