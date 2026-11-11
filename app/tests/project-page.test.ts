import { describe, expect, it } from "vitest";
import { projectPageView } from "@/lib/project-page";
import { PHRASES } from "@/lib/i18n/phrases";
import { readFileSync } from "fs";

const approved = { userId: "owner", reviewStatus: "APPROVED", shareWithCircle: true, seeking: "GENERAL_CONTRACTOR" };

describe("project page view", () => {
  it("owner sees the owner view, even before approval", () => {
    expect(projectPageView({ ...approved, reviewStatus: "PENDING_REVIEW" }, { id: "owner", isAdmin: false, inOwnerCircle: false })).toBe("owner");
  });
  it("circle members see full details when shared", () => {
    expect(projectPageView(approved, { id: "c", isAdmin: false, inOwnerCircle: true })).toBe("full");
  });
  it("circle members see the basic view when not shared", () => {
    expect(projectPageView({ ...approved, shareWithCircle: false }, { id: "c", isAdmin: false, inOwnerCircle: true })).toBe("basic");
  });
  it("members in a sought category see the basic view", () => {
    expect(projectPageView(approved, { id: "x", isAdmin: false, inOwnerCircle: false, role: "GENERAL_CONTRACTOR" })).toBe("basic");
  });
  it("members not sought and not in the circle see nothing (#25)", () => {
    expect(projectPageView(approved, { id: "x", isAdmin: false, inOwnerCircle: false, role: "INSURANCE" })).toBe("hidden");
    expect(projectPageView({ ...approved, seeking: "" }, { id: "x", isAdmin: false, inOwnerCircle: false, role: "LENDER" })).toBe("hidden");
  });
  it("staff always see the project", () => {
    expect(projectPageView({ ...approved, seeking: "" }, { id: "a", isAdmin: true, inOwnerCircle: false, role: "INSURANCE" })).toBe("full");
  });
  it("unapproved projects are hidden from other members", () => {
    expect(projectPageView({ ...approved, reviewStatus: "PENDING_REVIEW" }, { id: "x", isAdmin: false, inOwnerCircle: true })).toBe("hidden");
  });
  it("routes /projects through the app middleware", () => {
    expect(readFileSync("src/lib/http-document.ts", "utf8")).toContain('"/projects"');
  });
  it("new strings are in all languages", () => {
    for (const key of ["Who's interested", "Matching members", "Documents & photos", "Add another file", "Choose a PDF, JPG, PNG, or HEIC up to 5 MB."]) {
      const row = (PHRASES as unknown as Record<string, string[]>)[key];
      expect(row?.length).toBe(3);
      row.forEach((v) => expect(v.length).toBeGreaterThan(0));
    }
  });
});
