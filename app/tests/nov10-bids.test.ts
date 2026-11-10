import { describe, expect, it } from "vitest";
import { canAddVersion, MAX_BID_VERSIONS, MORE_DETAIL_FIELDS, pickVersion, tradeChoiceOk, tradeChoices, versionName, versionsOf } from "@/lib/bid-revisions";
import { parseFields } from "@/lib/bids";
import { SUBCONTRACTOR_TEMPLATE } from "@/lib/bid-templates";
import { phrase } from "@/lib/i18n/phrases";
import { ROLES } from "@/lib/roles";

describe("Nov 10: bids", () => {
  it("unit pricing is gone from the sub template and from older stored templates", () => {
    expect(SUBCONTRACTOR_TEMPLATE.fields.some((f) => f.key === "unitPricing")).toBe(false);
    const old = JSON.stringify([{ key: "total", label: "Lump sum", type: "money", section: "price" }, { key: "unitPricing", label: "Unit pricing", type: "long", section: "price" }]);
    expect(parseFields(old).map((f) => f.key)).toEqual(["total"]);
  });
  it("exclusions and assumptions sit behind More details", () => {
    expect([...MORE_DETAIL_FIELDS].sort()).toEqual(["assumptions", "exclusions"]);
  });
  it("keeps the original plus up to 5 updates", () => {
    expect(MAX_BID_VERSIONS).toBe(6);
    expect(canAddVersion(0)).toBe(true);
    expect(canAddVersion(5)).toBe(true);
    expect(canAddVersion(6)).toBe(false);
    expect(versionName(1)).toEqual({ key: "Original", n: 0 });
    expect(versionName(3)).toEqual({ key: "Revision {n}", n: 2 });
  });
  it("shows the latest version by default and any version on request", () => {
    const at = new Date("2026-11-10T14:00:00Z");
    const revs = [1, 2, 3].map((version) => ({ version, values: `{"total":${version}}`, submittedAt: at }));
    expect(pickVersion(revs)?.version).toBe(3);
    expect(pickVersion(revs, "1")?.version).toBe(1);
    expect(pickVersion(revs, "9")?.version).toBe(3);
    expect(pickVersion([], "1")).toBeNull();
  });
  it("a bid sent before Nov 10 counts its current numbers as the original", () => {
    const at = new Date("2026-11-09T14:00:00Z");
    expect(versionsOf({ values: "{}", submittedAt: at, status: "SUBMITTED" }, [])).toHaveLength(1);
    expect(versionsOf({ values: "{}", submittedAt: null, status: "DRAFT" }, [])).toHaveLength(0);
  });
  it("Trade is picked from the trades the sub chose when joining", () => {
    expect(tradeChoices("ELECTRICAL,HVAC")).toEqual(["Electrical", "HVAC"]);
    expect(tradeChoiceOk("HVAC", "ELECTRICAL,HVAC")).toBe(true);
    expect(tradeChoiceOk("Plumbing", "ELECTRICAL,HVAC")).toBe(false);
    expect(tradeChoiceOk("anything", "")).toBe(true);
  });
  it("the requester's category label and the new bid wording are translated (Japanese always differs)", () => {
    for (const role of ROLES) expect(phrase("ja", role.label), role.label).not.toBe(role.label);
    for (const key of ["Bid Opportunities", "Update Bid", "Thanks for submitting.", "More details", "Revision {n}", "Requests received & bids sent", "Bid packages that match your trades and service areas."]) {
      expect(phrase("ja", key)).not.toBe(key);
      expect(phrase("es", key)).not.toBe(key);
    }
  });
});
