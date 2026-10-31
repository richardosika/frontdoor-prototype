import { describe, expect, it } from "vitest";
import { coverageSummary, normalizeCoverage, parseMoney, coverageFromForm } from "@/lib/insurance";
describe("#46 insurance", () => {
  it("parses money", () => { expect(parseMoney("$2,000,000")).toBe(2e6); expect(parseMoney("1.5m")).toBe(1.5e6); expect(parseMoney("abc")).toBeNull(); expect(parseMoney("")).toBeNull(); });
  it("summarizes", () => {
    const c = normalizeCoverage([{ type: "GL", limit: 2e6, aggregate: 4e6 }, { type: "UMBRELLA", limit: 1e7 }, { type: "OTHER", limit: 5e5, name: "Cyber" }, { type: "BAD" }]);
    expect(coverageSummary(c)).toBe("General liability $2M / $4M · Umbrella / excess $10M · Cyber $500K");
  });
  it("reads only checked boxes", () => {
    const f = new FormData(); f.append("insCov", "GL"); f.set("insLim_GL", "2000000"); f.set("insAgg_GL", "4000000"); f.set("insLim_AUTO", "1000000");
    expect(coverageFromForm(f)).toEqual([{ type: "GL", limit: 2e6, aggregate: 4e6 }]);
  });
});
