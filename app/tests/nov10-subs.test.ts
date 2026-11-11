import { describe, expect, it } from "vitest";
import { canContactAboutProject, interestCategories } from "@/lib/project-contact";
import { categoryVisibleTo, isSubOnly, opportunityOwnerRoles, SUB_HIDDEN_ROLES, subCanReach, subCanSee } from "@/lib/sub-access";
import { filterDirectory, type DirectoryRow } from "@/lib/member-directory";
import { memberNav } from "@/lib/member-reach";
import { phrase } from "@/lib/i18n/phrases";
import { NOV10_PHRASES } from "@/lib/i18n/nov10-phrases";

const sub = { id: "s1", role: "SUBCONTRACTOR", extraCategories: "" };
const gc = { id: "g1", role: "GENERAL_CONTRACTOR", extraCategories: "" };
const arch = { id: "a1", role: "ARCHITECT_ENGINEER", extraCategories: "" };
const dev = { id: "d1", role: "DEVELOPER", extraCategories: "" };

describe("Nov 10: subcontractor access", () => {
  it("only members whose membership type is Subcontractor are restricted", () => {
    expect(isSubOnly(sub)).toBe(true);
    expect(isSubOnly(gc)).toBe(false);
    expect(isSubOnly({ role: "SUBCONTRACTOR", extraCategories: "GENERAL_CONTRACTOR" })).toBe(false);
  });
  it("subs reach GCs and architects directly, never developers", () => {
    expect(subCanReach(sub, gc)).toBe(true);
    expect(subCanReach(sub, arch)).toBe(true);
    expect(subCanReach(sub, dev)).toBe(false);
    expect(subCanReach(sub, { role: "LENDER" })).toBe(false);
  });
  it("Development Partners are one way: a developer can reach a sub", () => {
    expect(subCanReach(dev, sub)).toBe(true);
    expect(subCanSee(dev, sub)).toBe(true);
    const project = { userId: "d1", reviewStatus: "APPROVED", seeking: "SUBCONTRACTOR" };
    expect(canContactAboutProject({ project, from: dev, to: sub }).ok).toBe(true);
    expect(canContactAboutProject({ project, from: sub, to: dev }).ok).toBe(false);
  });
  it("a sub can express interest in a GC project seeking subs", () => {
    const project = { userId: "g1", reviewStatus: "APPROVED", seeking: "SUBCONTRACTOR" };
    expect(canContactAboutProject({ project, from: sub, to: gc })).toEqual({ ok: true, category: "SUBCONTRACTOR" });
  });
  it("Julia's nine vendor categories and developers are hidden from subs", () => {
    for (const role of ["DEVELOPER", "EXCHANGE_1031", "APPRAISER", "INVESTOR_PE", "FAMILY_OFFICE", "LENDER", "BROKER", "SECURITIES_ATTORNEY", "TITLE_COMPANY", "ZONING_ATTORNEY"]) {
      expect(SUB_HIDDEN_ROLES).toContain(role);
      expect(subCanSee(sub, { role })).toBe(false);
      expect(subCanSee(gc, { role })).toBe(true);
    }
    expect(subCanSee(sub, { role: "RE_ATTORNEY" })).toBe(true);
    expect(categoryVisibleTo(sub, "EQUITY")).toBe(false);
    expect(categoryVisibleTo(sub, "GENERAL_CONTRACTOR")).toBe(true);
    expect(categoryVisibleTo(gc, "EQUITY")).toBe(true);
  });
  it("subs no longer get the GC add-on; Opportunities come from GCs and architects", () => {
    expect(interestCategories(sub)).toEqual(["SUBCONTRACTOR"]);
    expect(opportunityOwnerRoles(sub)).toEqual(["GENERAL_CONTRACTOR", "ARCHITECT_ENGINEER"]);
    expect(opportunityOwnerRoles(gc)).toEqual(["DEVELOPER"]);
  });
});

describe("Nov 10: Member Directory", () => {
  const row = (id: string, name: string, role: string, extra: Partial<DirectoryRow> = {}): DirectoryRow => ({
    id, name, initials: name.slice(0, 2), org: `${name} Co`, role, location: "Newark, NJ", status: "ACTIVE", paymentStatus: "PAID", email: `${id}@example.com`, ...extra,
  });
  const rows = [
    row("g1", "Elena Voss", "GENERAL_CONTRACTOR"),
    row("d1", "Marcus Hale", "DEVELOPER", { location: "Austin, TX" }),
    row("l1", "Lena Brook", "LENDER"),
    row("x1", "Staff Person", "GENERAL_CONTRACTOR", { email: "connect@privatefloorclub.com" }),
    row("p1", "Pat Due", "GENERAL_CONTRACTOR", { paymentStatus: "DUE" }),
    row("b1", "Blocked Guy", "GENERAL_CONTRACTOR"),
    row("s1", "Me Myself", "SUBCONTRACTOR"),
  ];
  it("lists members, never staff, unpaid, blocked or yourself", () => {
    const ids = filterDirectory(rows, gc, {}, { blocked: new Set(["b1"]) }).map((r) => r.id);
    expect(ids).toEqual(["l1", "d1", "s1"]); // sorted by name; g1 is the viewer
    expect(ids).not.toContain("x1");
    expect(ids).not.toContain("p1");
    expect(ids).not.toContain("b1");
  });
  it("subs do not see developers or hidden categories", () => {
    const ids = filterDirectory(rows, sub, {}, { blocked: new Set(["b1"]) }).map((r) => r.id);
    expect(ids).toEqual(["g1"]);
  });
  it("searches by name, company, category and location", () => {
    expect(filterDirectory(rows, gc, { q: "marcus" }).map((r) => r.id)).toEqual(["d1"]);
    expect(filterDirectory(rows, gc, { q: "lena brook co" }).map((r) => r.id)).toEqual(["l1"]);
    expect(filterDirectory(rows, gc, { location: "austin" }).map((r) => r.id)).toEqual(["d1"]);
    expect(filterDirectory(rows, gc, { category: "LENDER" }).map((r) => r.id)).toEqual(["l1"]);
    expect(filterDirectory(rows, gc, { q: "developers" }).map((r) => r.id)).toEqual(["d1"]);
  });
  it("is in everyone's navigation and translated", () => {
    expect(memberNav("SUBCONTRACTOR").some((t) => t.href === "/directory")).toBe(true);
    expect(memberNav("DEVELOPER").some((t) => t.href === "/directory")).toBe(true);
    for (const locale of ["es", "de", "ja"] as const) {
      expect(phrase(locale, "Member Directory")).not.toBe("Member Directory");
    }
    for (const [, v] of Object.entries(NOV10_PHRASES)) expect(v.every((x) => x.trim().length > 0)).toBe(true);
  });
});
