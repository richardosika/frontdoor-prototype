import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { adminNoticeCookieValue, readAdminNoticeCookie } from "@/lib/admin-notice";
import { plainActivityText } from "@/lib/admin-home";
import { OUTSIDE_REGISTRY_TITLE, approvalAttentionTitle, freeRegistryState } from "@/lib/approval-warning";
import { footerNoteFor } from "@/lib/email-layout";
import { templateDef } from "@/lib/email-templates";

const ROOT = path.resolve(__dirname, "../src");

describe("PF Tester October 27 batch", () => {
  it("keeps the outside-the-list line off a real listed US city", () => {
    expect(freeRegistryState("Chicago, IL")).toBe("IL");
    expect(freeRegistryState("Springfield, Illinois")).toBe("IL");
    expect(freeRegistryState("Austin, TX")).toBe("TX");
    expect(freeRegistryState("London, UK")).toBeNull();
    expect(freeRegistryState("Columbus, OH")).toBeNull();
    expect(approvalAttentionTitle(OUTSIDE_REGISTRY_TITLE, "Chicago, IL")).toContain("No free IL registry API");
    expect(approvalAttentionTitle(OUTSIDE_REGISTRY_TITLE, "Chicago, IL")).not.toContain("outside the free US registry list");
    expect(approvalAttentionTitle(OUTSIDE_REGISTRY_TITLE, "London, UK")).toBe(OUTSIDE_REGISTRY_TITLE);
    expect(approvalAttentionTitle("Thin public record", "Chicago, IL")).toBe("Thin public record");
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
    expect(form).toContain("createPortal");
    expect(form).toContain("setAcknowledged");
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
