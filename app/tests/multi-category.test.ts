import { describe, expect, it } from "vitest";
import { canContactAboutProject, canRequestDealRoom, categoryMemberWhere, memberCategories, memberInCategory, projectSeeksRole, SEEK_CATEGORIES } from "@/lib/project-contact";
import { projectAccessible } from "@/lib/member-reach";
import { matchNewMember } from "@/lib/member-alerts";

const combos = [
  { role: "INSURANCE", extra: "SURETY_BONDING", second: "SURETY_BONDING" },
  { role: "CIVIL_ENGINEER", extra: "STRUCTURAL_ENGINEER", second: "STRUCTURAL_ENGINEER" },
  { role: "BROKER", extra: "PROPERTY_MANAGER", second: "PROPERTY_MANAGER" },
  { role: "ZONING_ATTORNEY", extra: "RE_ATTORNEY", second: "RE_ATTORNEY" },
];

describe("#42 multi-category members", () => {
  it("lists the main category first, then extras, without duplicates or unknown ids", () => {
    expect(memberCategories({ role: "INSURANCE", extraCategories: "SURETY_BONDING,INSURANCE,NOPE" })).toEqual(["INSURANCE", "SURETY_BONDING"]);
    expect(memberCategories({ role: "LENDER" })).toEqual(["FINANCING"]);
  });
  it("no category id is a substring of another (the database filter uses contains)", () => {
    const ids = SEEK_CATEGORIES.map((c) => c.id);
    for (const a of ids) for (const b of ids) if (a !== b) expect(b.includes(a)).toBe(false);
  });
  for (const c of combos) {
    const member = { id: "m", role: c.role, extraCategories: c.extra };
    const project = { userId: "dev", seeking: c.second, reviewStatus: "APPROVED" };
    it(`${c.role} + ${c.extra}: sees, contacts, gets alerts and deal rooms for the extra category`, () => {
      expect(memberInCategory(member, c.second)).toBe(true);
      expect(projectSeeksRole(project, c.role, c.extra)).toBe(true);
      expect(projectAccessible(project, { id: "m", isAdmin: false, role: c.role, extraCategories: c.extra, inOwnerCircle: false })).toBe(true);
      expect(canContactAboutProject({ project, from: member, to: { id: "dev", role: "DEVELOPER" } })).toEqual({ ok: true, category: c.second });
      expect(canContactAboutProject({ project, from: { id: "dev", role: "DEVELOPER" }, to: member }).ok).toBe(true);
      expect(canRequestDealRoom({ categories: [c.second], requesterRole: c.role, requesterExtra: c.extra, related: false }).ok).toBe(true);
      expect(matchNewMember(member, [{ ...project, name: "P" }]).get("dev")).toEqual(["P"]);
      expect(JSON.stringify(categoryMemberWhere([c.second]))).toContain(c.second);
    });
    it(`${c.role} without the extra category still sees nothing for ${c.second}`, () => {
      expect(projectAccessible(project, { id: "m", isAdmin: false, role: c.role, inOwnerCircle: false })).toBe(false);
      expect(canContactAboutProject({ project, from: { id: "m", role: c.role }, to: { id: "dev", role: "DEVELOPER" } }).ok).toBe(false);
    });
  }
});
