import { describe, expect, it } from "vitest";
import { assetCoverage, auditMatches, canAddField, readinessGrid, slugifyLabel, FIELD_CAP } from "@/lib/platform/admin-taxonomy";

describe("directory setup", () => {
  it("builds a slug and stops a type at the field cap", () => {
    expect(slugifyLabel("Memory care")).toBe("memory-care");
    expect(slugifyLabel("  Hotel / keys ")).toBe("hotel-keys");
    expect(canAddField(FIELD_CAP - 1).ok).toBe(true);
    expect(canAddField(FIELD_CAP).ok).toBe(false);
  });

  it("counts non-TEST members and marks a thin cell as growing", () => {
    const grid = readinessGrid({
      thinMin: 5,
      roles: ["DEVELOPER", "GENERAL_CONTRACTOR"],
      markets: [
        { code: "19100", name: "Dallas", focus: true },
        { code: "38060", name: "Phoenix", focus: false },
      ],
      focusOnly: true,
      members: [
        { role: "DEVELOPER", isTest: false, marketCodes: ["19100"], assetSlugs: ["multifamily"] },
        { role: "DEVELOPER", isTest: true, marketCodes: ["19100"], assetSlugs: ["multifamily"] },
        { role: "GENERAL_CONTRACTOR", isTest: false, marketCodes: ["38060"], assetSlugs: ["self-storage"] },
      ],
    });
    expect(grid.map((cell) => cell.marketName)).toEqual(["Dallas", "Dallas"]);
    const developers = grid.find((cell) => cell.role === "DEVELOPER");
    expect(developers).toMatchObject({ count: 1, testCount: 1, growing: true });
    const coverage = assetCoverage({
      members: [{ role: "DEVELOPER", isTest: false, marketCodes: [], assetSlugs: ["multifamily"] }],
      assets: [{ slug: "multifamily", label: "Multifamily" }],
    });
    expect(coverage[0]).toMatchObject({ count: 1, testCount: 0 });
  });

  it("searches audit rows by text and target", () => {
    const row = { summary: "Richard updated market Dallas.", action: "MARKET", targetType: "market", targetUserId: "" };
    expect(auditMatches(row, { q: "dallas" })).toBe(true);
    expect(auditMatches(row, { q: "licence" })).toBe(false);
    expect(auditMatches(row, { targetType: "asset" })).toBe(false);
    expect(auditMatches(row, { targetType: "market", q: "market" })).toBe(true);
  });
});
