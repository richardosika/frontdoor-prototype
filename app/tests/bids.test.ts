import { describe, expect, it } from "vitest";
import { ALL_TEMPLATE_SEEDS } from "@/lib/bid-templates";
import { allowedRecipients, bestPerRow, canDecide, canEditBid, canRequestBids, cleanQuestions, isPdf, missingFields, perUnit, readBidValues, requestRole } from "@/lib/bids";
import { BID_PHRASES } from "@/lib/i18n/bid-phrases";
import { PHRASES } from "@/lib/i18n/phrases";
import { SEEK_CATEGORIES } from "@/lib/project-contact";

const form = (o: Record<string, string | string[]>) => ({ get: (k: string) => (Array.isArray(o[k]) ? o[k][0] : o[k]) ?? null, getAll: (k: string) => (Array.isArray(o[k]) ? o[k] : o[k] ? [o[k]] : []) });

describe("#51 bid templates", () => {
  it("seeds one template for every member category, each with the common section", () => {
    for (const c of SEEK_CATEGORIES) expect(ALL_TEMPLATE_SEEDS.some((t) => t.category === c.id), c.id).toBe(true);
    for (const t of ALL_TEMPLATE_SEEDS) {
      const keys = t.fields.map((f) => f.key);
      for (const k of ["total", "start", "duration", "paymentTerms", "validUntil", "exclusions"]) expect(keys, `${t.category} ${k}`).toContain(k);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
  it("GC v3 has the mockup fields", () => {
    const gc = ALL_TEMPLATE_SEEDS.find((t) => t.category === "GENERAL_CONTRACTOR")!;
    expect(gc.version).toBe(3);
    expect(gc.fields.map((f) => f.key)).toEqual(expect.arrayContaining(["generalConditions", "sitework", "structure", "mep", "finishes", "feePct", "contingency", "alternates", "bonding", "profileInsurance", "profileLicense"]));
  });
  it("every template label, option and bid phrase is translated to ES, DE and JA", () => {
    const texts = new Set<string>(Object.keys(BID_PHRASES));
    for (const t of ALL_TEMPLATE_SEEDS) {
      texts.add(t.name);
      for (const f of t.fields) {
        texts.add(f.label);
        for (const o of f.options ?? []) texts.add(o);
      }
    }
    for (const text of texts) expect(PHRASES[text], text).toHaveLength(3);
  });
  it("never uses banned wording", () => {
    const all = JSON.stringify(BID_PHRASES) + JSON.stringify(ALL_TEMPLATE_SEEDS);
    expect(all).not.toMatch(/invite|invited|founding member|limited/i);
  });
});

describe("#51 who can request and see", () => {
  it("owners and members active on the project may request; outsiders may not", () => {
    expect(canRequestBids({ viewerId: "dev", ownerId: "dev", audience: [] })).toBe(true);
    expect(canRequestBids({ viewerId: "gc", ownerId: "dev", audience: ["gc"] })).toBe(true);
    expect(canRequestBids({ viewerId: "x", ownerId: "dev", audience: ["gc"] })).toBe(false);
  });
  it("recipients come only from the project or accepted connections, never the requester", () => {
    const s = allowedRecipients({ requesterId: "gc", ownerId: "dev", audience: ["gc", "ins"], connections: ["friend"] });
    expect([...s].sort()).toEqual(["dev", "friend", "ins"]);
  });
  it("outsiders see nothing; staff are not bidders", () => {
    const req = { requesterId: "dev", recipientIds: ["gc"] };
    expect(requestRole(req, { id: "dev", isAdmin: false })).toBe("requester");
    expect(requestRole(req, { id: "gc", isAdmin: false })).toBe("recipient");
    expect(requestRole(req, { id: "x", isAdmin: false })).toBe("none");
    expect(requestRole(req, { id: "a", isAdmin: true })).toBe("staff");
  });
});

describe("#51 bids and comparison", () => {
  const fields = ALL_TEMPLATE_SEEDS.find((t) => t.category === "GENERAL_CONTRACTOR")!.fields;
  it("reads numbers from formatted input and keeps only allowed checklist options", () => {
    const v = readBidValues(fields, form({ f_total: "$38,400,000", f_feePct: "4.0%", f_exclusionList: ["Builder's risk by owner", "hack"], f_start: "2027-03-01" }));
    expect(v.total).toBe("38400000");
    expect(v.feePct).toBe("4");
    expect(v.exclusionList).toEqual(["Builder's risk by owner"]);
  });
  it("flags missing required fields and unanswered questions", () => {
    const m = missingFields(fields, { total: "1" }, ["Q?"], [""]);
    expect(m).toContain("contingency");
    expect(m).toContain("q1");
    expect(m).not.toContain("alternates");
    expect(m).not.toContain("profileInsurance");
  });
  it("highlights the lowest cost and the shortest duration per row", () => {
    const best = bestPerRow(fields, [
      { id: "a", values: { total: "38400000", duration: "22" } },
      { id: "b", values: { total: "36900000", duration: "24" } },
      { id: "c", values: { total: "40200000", duration: "20" } },
    ]);
    expect(best.total).toEqual(["b"]);
    expect(best.duration).toEqual(["c"]);
    expect(bestPerRow(fields, [{ id: "a", values: { feePct: "4" } }, { id: "b", values: { feePct: "4" } }]).feePct).toBeUndefined();
  });
  it("normalizes per unit and per SF", () => {
    expect(perUnit(38400000, 120)).toBe(320000);
    expect(perUnit(38400000, 132000)).toBe(290.91);
    expect(perUnit(1, 0)).toBeNull();
  });
  it("decisions: shortlist/decline/award only while open; award closes", () => {
    expect(canDecide("SUBMITTED", "OPEN", "AWARDED")).toBe(true);
    expect(canDecide("DRAFT", "OPEN", "AWARDED")).toBe(false);
    expect(canDecide("SUBMITTED", "AWARDED", "SHORTLISTED")).toBe(false);
    expect(canDecide("SHORTLISTED", "OPEN", "SHORTLISTED")).toBe(false);
  });
  it("bidders edit until the due date and before a decision", () => {
    const dueAt = new Date(Date.now() + 86400000);
    expect(canEditBid({ requestStatus: "OPEN", dueAt })).toBe(true);
    expect(canEditBid({ requestStatus: "OPEN", dueAt, bidStatus: "SHORTLISTED" })).toBe(false);
    expect(canEditBid({ requestStatus: "OPEN", dueAt: new Date(Date.now() - 1000) })).toBe(false);
  });
  it("up to 3 questions, PDFs by magic bytes", () => {
    expect(cleanQuestions(["a", "", "b", "c", "d"])).toEqual(["a", "b", "c"]);
    expect(isPdf(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(isPdf(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe(false);
  });
});

describe("#51 cleanup keeps the Bids demo", () => {
  it("sample GCs and Maple Court survive CLEAN_TEST_DATA", async () => {
    const { keptUser, BIDS_DEMO_USER_IDS, BIDS_DEMO_PROJECT_IDS } = await import("@/lib/clean-test-data");
    for (const id of BIDS_DEMO_USER_IDS) expect(keptUser({ id })).toBe(true);
    for (const id of ["user_demo_lender", "user_demo_lp"]) expect(keptUser({ id })).toBe(true);
    expect(BIDS_DEMO_PROJECT_IDS).toContain("proj_maple_court");
  });
});
