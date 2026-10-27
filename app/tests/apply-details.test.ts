import { describe, expect, it } from "vitest";
import { applyDetailsIssues, stillNeeded, type ApplyDetailsInput } from "@/lib/apply-details";

const READY: ApplyDetailsInput = {
  firstName: "Ada",
  lastName: "Okoye",
  email: "ada@example.com",
  password: "correct-horse",
  org: "Northline Builders",
  street: "299 Market Street",
  city: "Saddle Brook",
  state: "NJ",
  zip: "07663",
  phone: "201-555-0148",
  linkedinUrl: "",
  website: "",
  socialLinks: "",
  referenceEmail: "",
  referenceEmail2: "",
  statement: "",
};

describe("apply details gate", () => {
  it("lists every empty required field and skips optional ones", () => {
    const issues = applyDetailsIssues({ ...READY, firstName: "", lastName: " ", email: "ada", password: "short", org: "A", street: "", city: "X", state: "New Jersey", zip: "7663", phone: "" });
    expect(stillNeeded(issues)).toBe(
      "Still needed: first name, last name, email, password, company, street, city, state, ZIP, contact phone",
    );
    expect(issues.some((issue) => issue.id === "apply-linkedin")).toBe(false);
  });

  it("names only the required fields that are still missing", () => {
    const issues = applyDetailsIssues({ ...READY, zip: "", phone: "555" });
    expect(stillNeeded(issues)).toBe("Still needed: ZIP, contact phone");
    expect(issues.map((issue) => issue.id)).toEqual(["apply-zip", "apply-phone"]);
  });

  it("rejects a fake state and a zero ZIP", () => {
    const issues = applyDetailsIssues({ ...READY, state: "ZZ", zip: "00000" });
    expect(issues.find((issue) => issue.id === "apply-state")?.message).toBe("Enter a real two-letter US state.");
    expect(issues.find((issue) => issue.id === "apply-zip")?.message).toBe("Enter a real ZIP code.");
  });

  it("rejects a password shorter than 8 characters", () => {
    const issues = applyDetailsIssues({ ...READY, password: "short" });
    expect(issues.find((issue) => issue.id === "apply-password")?.message).toBe("Password must be at least 8 characters.");
    expect(applyDetailsIssues(READY).some((issue) => issue.id === "apply-password")).toBe(false);
  });

  it("treats a filled optional field as required until it is valid", () => {
    const issues = applyDetailsIssues({ ...READY, linkedinUrl: "linkedin.com/in/ada", website: "northline.example" });
    expect(stillNeeded(issues)).toBe("Still needed: LinkedIn URL, website");
    expect(applyDetailsIssues(READY)).toEqual([]);
    expect(applyDetailsIssues({ ...READY, linkedinUrl: "https://www.linkedin.com/in/ada" })).toEqual([]);
  });
});
