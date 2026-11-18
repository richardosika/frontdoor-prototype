import { describe, expect, it } from "vitest";
import { gettingStarted } from "@/lib/member-reach";
import { roleProfile } from "@/lib/role-profile";
import { phrase } from "@/lib/i18n/phrases";

const base = { profileDone: true, ndaAccepted: true, projectCount: 0, seekingSet: false, approvedProject: false, outreachSent: 0, hasPhoto: false, hasCredential: true };
const step = (role: string) => {
  const items = gettingStarted({ ...base, role });
  return items.find((i) => i.id === "work" || i.id === "project")!;
};

describe("Nov 16: Getting started says Add a project for project-posting roles", () => {
  it("uses Add a project and the Add a project form for the five roles", () => {
    expect(step("DEVELOPER")).toMatchObject({ label: "Add a project", href: "/projects?add=1#add-project" });
    for (const role of ["GENERAL_CONTRACTOR", "ARCHITECT_ENGINEER", "INVESTOR_PE", "FAMILY_OFFICE"]) {
      expect(step(role)).toMatchObject({ label: "Add a project", href: "/profile#add-project" });
    }
    expect(JSON.stringify(gettingStarted({ ...base, role: "INVESTOR_PE" }))).not.toContain("past investment");
  });
  it("keeps past work for other roles", () => {
    for (const role of ["LENDER", "SUBCONTRACTOR"]) expect(step(role)).toMatchObject({ label: roleProfile(role).portfolio, href: "/profile#past-work" });
  });
  it("is translated", () => {
    expect(phrase("es", "Add a project")).toBe("Añadir un proyecto");
    expect(phrase("de", "Add a project")).toBe("Projekt hinzufügen");
    expect(phrase("ja", "Add a project")).toBe("プロジェクトを追加");
  });
});
