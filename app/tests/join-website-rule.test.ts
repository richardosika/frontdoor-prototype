import { describe, expect, it } from "vitest";
import { emptyProfile, joinErrorField, pageOneErrors, websiteOptional } from "@/lib/join-form";
import { phrase } from "@/lib/i18n/phrases";

function filled(role: string, website: string) {
  return {
    ...emptyProfile(role),
    firstName: "Ada", lastName: "Lane", email: "ada@lane.co", phone: "3055551234", role,
    company: "Lane Co", website, street: "1 Main St", city: "Miami", state: "FL", zip: "33101",
    links: [{ kind: "LinkedIn (personal)", url: "linkedin.com/in/ada" }],
  };
}

describe("company website rule", () => {
  it("is optional only for Developers", () => {
    expect(websiteOptional("DEVELOPER")).toBe(true);
    expect(websiteOptional("LENDER")).toBe(false);
    expect(websiteOptional("INVESTOR_PE")).toBe(false);
  });
  it("lets a Developer with a company name continue without a website", () => {
    expect(pageOneErrors(filled("DEVELOPER", ""))).not.toContain("Enter your company website.");
  });
  it("blocks other roles without a website", () => {
    expect(pageOneErrors(filled("LENDER", ""))).toContain("Enter your company website.");
    expect(pageOneErrors(filled("LENDER", "lane.co"))).not.toContain("Enter your company website.");
  });
});

describe("inline error mapping", () => {
  it("maps messages to their field", () => {
    expect(joinErrorField("Enter your company website.")).toBe("website");
    expect(joinErrorField("Enter a valid email.")).toBe("email");
    expect(joinErrorField("Enter a two-letter state.")).toBe("state");
    expect(joinErrorField("Pick at least one region.")).toBe("regions");
    expect(joinErrorField("Create a password of at least 8 characters.")).toBe("password");
    expect(joinErrorField("Pick at least one loan type.")).toBe("roleDetails");
  });
  it("translates the new copy in ES, DE, JA", () => {
    for (const locale of ["es", "de", "ja"] as const) {
      expect(phrase(locale, "Submitting your application…")).not.toBe("Submitting your application…");
      expect(phrase(locale, "Enter your company website.")).not.toBe("Enter your company website.");
    }
  });
});
