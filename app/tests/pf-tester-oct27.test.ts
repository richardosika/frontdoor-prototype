import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { adminNoticeCookieValue, readAdminNoticeCookie } from "@/lib/admin-notice";
import { plainActivityText } from "@/lib/admin-home";
import { OUTSIDE_REGISTRY_TITLE, approvalAttentionTitle, freeRegistryState } from "@/lib/approval-warning";
import { footerNoteFor } from "@/lib/email-layout";
import { templateDef } from "@/lib/email-templates";
import { buildReviewSteps, parseReviewProgress } from "@/lib/review-steps";
import { registryLinkCheck } from "@/lib/verify/checks";
import { registryPortal } from "@/lib/verify/state-registries";
import type { ApplicantFacts } from "@/lib/verify/types";

const ROOT = path.resolve(__dirname, "../src");

function registryFacts(location: string, org = "Example Builders"): ApplicantFacts {
  return {
    name: "Ada Applicant",
    applicantName: "Ada Applicant",
    email: "ada@example.com",
    org,
    location,
    role: "GENERAL_CONTRACTOR",
    phone: "",
    website: "",
    linkedinUrl: "",
    socialLinks: "",
    statement: "",
    inviteNote: "",
    testProfile: "1",
    cardText: "",
    cardUploaded: false,
    duplicateOfMember: false,
    duplicateOfDeclined: false,
    recentApplications: 0,
  };
}

describe("PF Tester October 27 batch", () => {
  it("keeps the outside-the-list line off a real listed US city", () => {
    expect(freeRegistryState("Chicago, IL")).toBe("IL");
    expect(freeRegistryState("Springfield, Illinois")).toBe("IL");
    expect(freeRegistryState("Austin, TX")).toBe("TX");
    expect(freeRegistryState("London, UK")).toBeNull();
    expect(freeRegistryState("Columbus, OH")).toBe("OH");
    expect(freeRegistryState("Phoenix, Arizona")).toBe("AZ");
    expect(approvalAttentionTitle(OUTSIDE_REGISTRY_TITLE, "Chicago, IL")).toContain("No free IL registry API");
    expect(approvalAttentionTitle(OUTSIDE_REGISTRY_TITLE, "Chicago, IL")).not.toContain("outside the free US registry list");
    expect(approvalAttentionTitle(OUTSIDE_REGISTRY_TITLE, "London, UK")).toBe(OUTSIDE_REGISTRY_TITLE);
    expect(approvalAttentionTitle("Thin public record", "Chicago, IL")).toBe("Thin public record");
    expect(approvalAttentionTitle(OUTSIDE_REGISTRY_TITLE, "Phoenix, Arizona")).toContain("No free AZ registry API");
    expect(approvalAttentionTitle(OUTSIDE_REGISTRY_TITLE, "Phoenix, Arizona")).not.toContain("outside the free US registry list");
    for (const code of [
      "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
      "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD",
      "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    ]) {
      expect(freeRegistryState(`City, ${code}`)).toBe(code);
    }
    expect(freeRegistryState("Washington, D.C.")).toBe("DC");
    expect(freeRegistryState("Seattle, Washington")).toBe("WA");
    expect(freeRegistryState("Charleston, West Virginia")).toBe("WV");
    expect(freeRegistryState("Little Rock, Arkansas")).toBe("AR");
    expect(freeRegistryState("Toronto, Canada")).toBeNull();
    expect(freeRegistryState("Come in")).toBeNull();
    const review = readFileSync(path.join(ROOT, "components/guided-review.tsx"), "utf8");
    expect(review).toContain("decisionDialogBootstrap");
    const dialog = readFileSync(path.join(ROOT, "lib/decision-dialog.ts"), "utf8");
    expect(dialog).toContain("MutationObserver");
    expect(dialog).toContain("data-pf-held");
    const oldNote = "Couldn't check for free. No stable free registry API for this state. Search the secretary of state manually.";
    for (const code of [
      "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
      "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD",
      "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    ]) {
      const row = registryLinkCheck(registryFacts(`City, ${code}`));
      expect(row.finding).not.toContain("No stable free registry API");
      expect(row.url).toMatch(/^https:\/\//);
      if (!registryPortal(code)) {
        expect(row.finding).toContain(`No free ${code} registry API`);
        expect(row.finding).toContain("Open the state search");
      }
      const company = buildReviewSteps({
        evidence: [{ checkKey: "business-registry", status: "NOT_RUN", finding: oldNote, source: "State registry", url: "", corroborates: false }],
        saved: parseReviewProgress(null),
        references: [],
        cardOnFile: false,
        facts: { name: "Ada", org: "Example Builders", location: `City, ${code}` },
      }).find((step) => step.id === "company");
      const finding = company?.findings.find((item) => item.source === "State registry");
      expect(finding?.text).toContain(`No free ${code} registry API`);
      expect(finding?.text).toContain("Open the state search");
      expect(finding?.text).not.toContain("No stable free registry API");
      expect(finding?.url).toMatch(/^https:\/\//);
    }
    const rhodeIsland = registryLinkCheck(registryFacts("Providence, Rhode Island", "Gilbane"));
    expect(rhodeIsland.finding).toContain("No free RI registry API");
    expect(rhodeIsland.finding).toContain("Gilbane");
    expect(rhodeIsland.url).toContain("sos.ri.gov");
  });

  it("shows plain words for a needs-owner verdict in the activity feed", () => {
    expect(plainActivityText("APPLICATION · DONE · NEEDS_OWNER_DECISION · 49 · Northline")).toContain("Needs your decision");
    expect(plainActivityText("APPLICATION · DONE · NEEDS_OWNER_DECISION · 49 · Northline")).not.toContain("NEEDS_OWNER_DECISION");
    expect(plainActivityText("verdict NEEDS_OWNER_DECISION")).toBe("Needs your decision");
    const page = readFileSync(path.join(ROOT, "app/(app)/admin/page.tsx"), "utf8");
    expect(page).toContain("plainActivityText");
    expect(page).toContain("verdictLabel");
  });

  it("does not tell a declined applicant that the platform processes no payments", () => {
    const body = templateDef("declined")?.body || "";
    expect(body).not.toMatch(/\$|dues|price|charge|payment/i);
    const note = footerNoteFor("Your Private Floor application");
    expect(note).toBe("Private Floor does not offer securities or take investments.");
    expect(note).not.toContain("process payments through the platform");
  });

  it("keeps the approval checkbox outside the server form and restores a dropped Declined notice", () => {
    const form = readFileSync(path.join(ROOT, "components/decision-form.tsx"), "utf8");
    expect(form.indexOf('name="acknowledgeGrade"')).toBeGreaterThan(form.indexOf('role="dialog"'));
    expect(form.indexOf('name="acknowledgeGrade"')).toBeGreaterThan(form.indexOf("</form>"));
    expect(form).toContain('type="button" data-decision-open="APPROVED"');
    expect(form).toContain("sessionStorage");
    expect(form).not.toContain("createPortal");
    const action = readFileSync(path.join(ROOT, "actions/admin.ts"), "utf8");
    const succeed = action.slice(action.indexOf("const succeed"), action.indexOf("const decision ="));
    expect(succeed).toContain("rememberAdminNotice");
    expect(succeed).toContain("notice=");
    const now = Date.parse("2026-10-27T15:00:00.000Z");
    const cookie = adminNoticeCookieValue("case:abc", "Declined", now);
    expect(readAdminNoticeCookie(cookie, "case:abc", now + 1000)).toBe("Declined");
    expect(readAdminNoticeCookie(cookie, "case:other", now + 1000)).toBeNull();
    expect(readAdminNoticeCookie(cookie, "case:abc", now + 120_000)).toBeNull();
  });
});
