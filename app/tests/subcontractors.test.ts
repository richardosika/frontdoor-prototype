import { describe, expect, it } from "vitest";
import { TRADES, parseTrades, sortedTrades, statesFrom, subMatchesPackage, subProfileFromJoin, coiType, canOpenInsuranceCertificate } from "@/lib/trades";
import { canOpenRequest } from "@/lib/bid-plans";
import { canContactAboutProject, interestCategories } from "@/lib/project-contact";
import { projectAccessible } from "@/lib/member-reach";
import { monthlyDuesCents, firstMonthCents } from "@/lib/dues";
import { phrase } from "@/lib/i18n/phrases";
import { recommend, gcSubPair } from "@/lib/recommendations";
import { ROLE_SPECIALTIES, showsStateList } from "@/lib/join-form";

const sub = { id: "s1", role: "SUBCONTRACTOR", extraCategories: "", trades: "ELECTRICAL,PLUMBING", markets: "NJ, NY", location: "Newark, NJ", status: "ACTIVE", paymentStatus: "PAID" };

describe("Nov 6 subcontractors", () => {
  it("has the 17 trades, Title Case, Other Trades last in every language", () => {
    expect(TRADES).toHaveLength(17);
    for (const locale of ["en", "es", "de", "ja"] as const) {
      const list = sortedTrades(locale, (s) => phrase(locale, s));
      expect(list[list.length - 1].id).toBe("OTHER");
      for (const t of TRADES) if (locale !== "en") expect(phrase(locale, t.label), t.label).not.toBe(t.label);
    }
    expect(sortedTrades("en", (s) => s).map((t) => t.label).slice(0, 3)).toEqual(["Concrete", "Drywall", "Electrical"]);
  });
  it("reads trades from ids or join-form labels", () => {
    expect(parseTrades("ELECTRICAL, Plumbing, nope, Framing & Carpentry")).toEqual(["ELECTRICAL", "PLUMBING", "FRAMING_CARPENTRY"]);
    expect(statesFrom("Newark, NJ")).toEqual(["NJ"]);
  });
  it("matches packages by trade and state only", () => {
    expect(subMatchesPackage(sub, { trade: "ELECTRICAL", serviceStates: "NJ" })).toBe(true);
    expect(subMatchesPackage(sub, { trade: "HVAC", serviceStates: "NJ" })).toBe(false);
    expect(subMatchesPackage(sub, { trade: "ELECTRICAL", serviceStates: "TX" })).toBe(false);
    expect(subMatchesPackage({ ...sub, role: "GENERAL_CONTRACTOR" }, { trade: "ELECTRICAL", serviceStates: "NJ" })).toBe(false);
    expect(subMatchesPackage({ ...sub, markets: "" }, { trade: "ELECTRICAL", serviceStates: "NJ" })).toBe(true);
  });
  it("subs never open a full GC request, but open matching trade packages", () => {
    expect(canOpenRequest({ viewer: sub, requesterId: "dev", recipientIds: ["s1"], templateCategory: "GENERAL_CONTRACTOR" })).toBeNull();
    expect(canOpenRequest({ viewer: sub, requesterId: "gc", recipientIds: [], templateCategory: "SUBCONTRACTOR", trade: "PLUMBING", serviceStates: "NY" })).toBe("open");
    expect(canOpenRequest({ viewer: sub, requesterId: "gc", recipientIds: [], templateCategory: "SUBCONTRACTOR", trade: "ROOFING", serviceStates: "NY" })).toBeNull();
    expect(canOpenRequest({ viewer: { ...sub, paymentStatus: "DUE" }, requesterId: "gc", recipientIds: [], templateCategory: "SUBCONTRACTOR", trade: "PLUMBING", serviceStates: "NY" })).toBeNull();
  });
  it("Nov 10 replaces the Nov 6 rule: subs no longer see or contact developer projects seeking a GC", () => {
    expect(interestCategories(sub)).not.toContain("GENERAL_CONTRACTOR");
    const project = { userId: "dev", reviewStatus: "APPROVED", seeking: "GENERAL_CONTRACTOR", shareWithCircle: false };
    expect(projectAccessible(project, { id: "s1", isAdmin: false, inOwnerCircle: false, role: "SUBCONTRACTOR" })).toBe(false);
    expect(canContactAboutProject({ project, from: { id: "s1", role: "SUBCONTRACTOR" }, to: { id: "dev", role: "DEVELOPER" } }).ok).toBe(false);
  });
  it("pricing: subcontractors pay the standard $199 a month, first month half", () => {
    expect(monthlyDuesCents("SUBCONTRACTOR")).toBe(19_900);
    expect(monthlyDuesCents("SUBCONTRACTOR")).toBe(monthlyDuesCents("GENERAL_CONTRACTOR"));
    expect(firstMonthCents(monthlyDuesCents("SUBCONTRACTOR"))).toBe(9_950);
  });
  it("join form asks subs for trades and licensed states; approval carries them onto the profile", () => {
    expect(ROLE_SPECIALTIES.SUBCONTRACTOR?.options).toContain("Electrical");
    expect(showsStateList("SUBCONTRACTOR")).toBe(true);
    const out = subProfileFromJoin({ specialties: ["Electrical", "HVAC"], states: [{ state: "NJ", licensed: true, looking: true, licenseNumber: "34EI01234500" }, { state: "NY", licensed: false, looking: true, licenseNumber: "" }] });
    expect(out).toMatchObject({ trades: "ELECTRICAL,HVAC", markets: "NJ, NY", licenseState: "NJ", licenseNumber: "34EI01234500" });
  });
  it("GCs and subs are recommended to each other ahead of others", () => {
    const viewer = { id: "s1", role: "SUBCONTRACTOR", location: "Newark, NJ", markets: "NJ", assetClasses: "", trades: "ELECTRICAL", seeking: [] as string[] };
    const gc = { id: "g1", role: "GENERAL_CONTRACTOR", location: "Hoboken, NJ", markets: "NJ", assetClasses: "" };
    const dev = { id: "d1", role: "DEVELOPER", location: "Hoboken, NJ", markets: "NJ", assetClasses: "" };
    expect(gcSubPair(viewer, gc)).toBe("sub-sees-gc");
    const picks = recommend(viewer, [dev, gc], new Set());
    expect(picks[0].id).toBe("g1");
    expect(picks[0].line?.key).toBe("General contractor active in {place}, where you work");
  });
  it("checks certificate files by their bytes", () => {
    expect(coiType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("application/pdf");
    expect(coiType(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39]))).toBeNull();
  });
  it("every new phrase has Spanish, German and Japanese", async () => {
    const { SUB_PHRASES } = await import("@/lib/i18n/sub-phrases");
    for (const [k, v] of Object.entries(SUB_PHRASES)) {
      expect(v, k).toHaveLength(3);
      for (const t of v) expect(t.trim(), k).not.toBe("");
      for (const t of [k, ...v]) expect(/invite|founding member|limited/i.test(t), k).toBe(false);
    }
  });
});

describe("insurance certificate access (Nov 6, Richard Osika)", () => {
  const sub = { id: "s1", role: "SUBCONTRACTOR", extraCategories: "" };
  const gc = { id: "g1", role: "GENERAL_CONTRACTOR", extraCategories: "", status: "ACTIVE", paymentStatus: "PAID" };
  it("lets the sub, staff and approved active GCs open it", () => {
    expect(canOpenInsuranceCertificate({ ...sub }, sub)).toBe(true);
    expect(canOpenInsuranceCertificate({ id: "a1", role: "DEVELOPER", isAdmin: true }, sub)).toBe(true);
    expect(canOpenInsuranceCertificate(gc, sub)).toBe(true);
    expect(canOpenInsuranceCertificate({ ...gc, paymentStatus: "WAIVED" }, sub)).toBe(true);
    expect(canOpenInsuranceCertificate({ ...gc, role: "INSURER", extraCategories: "GENERAL_CONTRACTOR" }, sub)).toBe(true);
  });
  it("refuses other roles, inactive or unpaid GCs, and non-sub owners", () => {
    expect(canOpenInsuranceCertificate({ ...gc, role: "DEVELOPER" }, sub)).toBe(false);
    expect(canOpenInsuranceCertificate({ ...gc, id: "s2", role: "SUBCONTRACTOR" }, sub)).toBe(false);
    expect(canOpenInsuranceCertificate({ ...gc, status: "SUSPENDED" }, sub)).toBe(false);
    expect(canOpenInsuranceCertificate({ ...gc, paymentStatus: "UNPAID" }, sub)).toBe(false);
    expect(canOpenInsuranceCertificate(gc, { id: "x", role: "ARCHITECT_ENGINEER", extraCategories: "" })).toBe(false);
  });
});
