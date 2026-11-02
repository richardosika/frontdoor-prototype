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
