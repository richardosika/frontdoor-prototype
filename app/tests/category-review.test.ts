import { describe, expect, it } from "vitest";
import { applyCategoryPicks, decideCategory } from "@/lib/category-review";
import { memberCategories, canContactAboutProject } from "@/lib/project-contact";

describe("#42 category review", () => {
  it("new picks go to pending; approved ones stay; unticked ones are removed", () => {
    const r = applyCategoryPicks({ role: "INSURANCE", approved: "BROKER", pending: "", picked: ["INSURANCE", "SURETY_BONDING", "TITLE_COMPANY"] });
    expect(r).toEqual({ extraCategories: "", pendingCategories: "SURETY_BONDING,TITLE_COMPANY", added: ["SURETY_BONDING", "TITLE_COMPANY"] });
    const k = applyCategoryPicks({ role: "INSURANCE", approved: "SURETY_BONDING", pending: "TITLE_COMPANY", picked: ["SURETY_BONDING", "TITLE_COMPANY"] });
    expect(k).toEqual({ extraCategories: "SURETY_BONDING", pendingCategories: "TITLE_COMPANY", added: [] });
  });
  it("pending categories do not count for matching or contact", () => {
    const m = { id: "m", role: "INSURANCE", extraCategories: "", pendingCategories: "SURETY_BONDING" };
    expect(memberCategories(m)).toEqual(["INSURANCE"]);
    expect(canContactAboutProject({ project: { userId: "d", seeking: "SURETY_BONDING", reviewStatus: "APPROVED" }, from: m, to: { id: "d", role: "DEVELOPER" } }).ok).toBe(false);
  });
  it("licensed categories need the credential check to approve; decline needs none", () => {
    expect(decideCategory({ approved: "", pending: "SURETY_BONDING", category: "SURETY_BONDING", decision: "approve", credentialChecked: false }).ok).toBe(false);
    expect(decideCategory({ approved: "", pending: "SURETY_BONDING", category: "SURETY_BONDING", decision: "approve", credentialChecked: true })).toEqual({ ok: true, extraCategories: "SURETY_BONDING", pendingCategories: "", approved: true });
    expect(decideCategory({ approved: "BROKER", pending: "SURETY_BONDING,TITLE_COMPANY", category: "TITLE_COMPANY", decision: "decline", credentialChecked: false })).toEqual({ ok: true, extraCategories: "BROKER", pendingCategories: "SURETY_BONDING", approved: false });
    expect(decideCategory({ approved: "", pending: "", category: "PROPERTY_MANAGER", decision: "approve", credentialChecked: false }).ok).toBe(false);
    expect(decideCategory({ approved: "", pending: "PROPERTY_MANAGER", category: "PROPERTY_MANAGER", decision: "approve", credentialChecked: false }).ok).toBe(true);
  });
});
