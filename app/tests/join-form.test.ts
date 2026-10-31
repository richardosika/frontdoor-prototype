import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { monthlyDuesCents, firstMonthCents, FREE_ROLE_IDS } from "@/lib/dues";
import { isKnownAppPath } from "@/lib/http-document";
import { companyFieldsOptional, emptyProfile, pageKind, pageOneErrors, pageTwoErrors, showsProjects } from "@/lib/join-form";

function ready(role: string) {
  const profile = emptyProfile(role);
  profile.firstName = "Ada";
  profile.lastName = "Lovelace";
  profile.email = "ada@example.com";
  profile.phone = "2015550100";
  profile.company = "Example Co";
  profile.website = "https://example.com";
  profile.street = "1 Main";
  profile.city = "Newark";
  profile.state = "NJ";
  profile.zip = "07102";
  profile.links = [{ kind: "LinkedIn (personal)", url: "https://linkedin.com/in/ada" }];
  profile.title = "Principal";
  profile.regions = ["Northeast"];
  profile.propertyTypes = ["Single family / townhome"];
  profile.password = "long-password";
  profile.acceptTerms = true;
  profile.acceptVerification = true;
  profile.acceptMemberRisk = true;
  profile.acceptMemberNda = true;
  profile.states = [{ state: "NJ", licensed: true, looking: true, licenseNumber: "" }];
  profile.specialties = ["Tax"];
  profile.loanTypes = ["Bridge"];
  profile.loanSize = "Under $5M";
  profile.participation = ["LP (passive equity)"];
  profile.investorTypes = ["Individual"];
  profile.coverageTypes = ["Title"];
  profile.projects = [
    { name: "One", location: "Newark", role: "Builder", llc: "", link: "" },
    { name: "Two", location: "Jersey City", role: "Builder", llc: "", link: "" },
  ];
  return profile;
}

describe("two-page join form", () => {
  it("requires page 1 fields and a professional link", () => {
    const profile = emptyProfile();
    expect(pageOneErrors(profile).length).toBeGreaterThan(0);
    const filled = ready("DEVELOPER");
    filled.links = [{ kind: "LinkedIn (personal)", url: "" }];
    expect(pageOneErrors(filled).join(" ")).toMatch(/professional link/i);
    filled.links = [{ kind: "LinkedIn (personal)", url: "https://linkedin.com/in/ada" }];
    expect(pageOneErrors(filled)).toEqual([]);
  });

  it("lets developers and investors leave company name and website blank", () => {
    expect(companyFieldsOptional("DEVELOPER")).toBe(true);
    expect(companyFieldsOptional("INVESTOR_PE")).toBe(true);
    for (const role of ["DEVELOPER", "INVESTOR_PE"]) {
      const profile = ready(role);
      profile.company = "";
      profile.website = "";
      expect(pageOneErrors(profile)).toEqual([]);
    }
    for (const role of ["GENERAL_CONTRACTOR", "BROKER", "FAMILY_OFFICE", "LENDER", "INSURANCE"]) {
      const profile = ready(role);
      profile.company = "";
      profile.website = "";
      expect(pageOneErrors(profile).join(" ")).toMatch(/company name/i);
      expect(companyFieldsOptional(role)).toBe(false);
    }
    const form = readFileSync(path.join(__dirname, "../src/components/join-application.tsx"), "utf8");
    const server = readFileSync(path.join(__dirname, "../src/actions/join.ts"), "utf8");
    expect(form).toContain("companyFieldsOptional");
    expect(form).toContain("optional={companyOptional}");
    expect(server).toContain("pageOneErrors");
  });

  it("puts role details above projects and hides projects for attorneys", () => {
    expect(showsProjects("RE_ATTORNEY")).toBe(false);
    expect(showsProjects("GENERAL_CONTRACTOR")).toBe(true);
    expect(pageKind("INSURANCE")).toBe("licensed");
    expect(pageKind("MORTGAGE_BROKER")).toBe("licensed");
    expect(pageKind("PROPERTY_MANAGER")).toBe("specialty");
  });

  it("enforces role-specific required fields and keeps cost language off the form rules", () => {
    const gc = ready("GENERAL_CONTRACTOR");
    gc.projects = [];
    expect(pageTwoErrors(gc).join(" ")).toMatch(/two recent projects/i);
    gc.projects = ready("GENERAL_CONTRACTOR").projects;
    expect(pageTwoErrors(gc)).toEqual([]);

    const attorney = ready("RE_ATTORNEY");
    attorney.specialties = [];
    expect(pageTwoErrors(attorney).join(" ")).toMatch(/specialty/i);

    const lender = ready("LENDER");
    lender.loanTypes = [];
    expect(pageTwoErrors(lender).join(" ")).toMatch(/loan type/i);

    const family = ready("FAMILY_OFFICE");
    expect(pageTwoErrors(family)).toEqual([]);
    const form = readFileSync(path.join(__dirname, "../src/components/join-application.tsx"), "utf8");
    expect(form).not.toMatch(/\$199|\$99\.50|monthly dues|per month/i);
  });

  it("publishes the join pages without a sign-in wall", () => {
    expect(isKnownAppPath("/join")).toBe(true);
    expect(isKnownAppPath("/join/code")).toBe(true);
    const middleware = readFileSync(path.join(__dirname, "../src/middleware.ts"), "utf8");
    expect(middleware).toContain('"/join"');
  });

  it("charges every role except the four free ones", () => {
    for (const role of FREE_ROLE_IDS) expect(monthlyDuesCents(role)).toBe(0);
    for (const role of ["GENERAL_CONTRACTOR", "BROKER", "RE_ATTORNEY", "INSURANCE", "MORTGAGE_BROKER", "ARCHITECT_ENGINEER", "APPRAISER", "PROPERTY_MANAGER", "ACCOUNTANT", "EXCHANGE_1031"]) {
      expect(monthlyDuesCents(role)).toBe(19_900);
      expect(firstMonthCents(monthlyDuesCents(role))).toBe(9_950);
    }
  });
});
