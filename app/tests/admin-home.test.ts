import { describe, expect, it } from "vitest";
import {
  ADMIN_GROUPS,
  activitySince,
  adminLinkActive,
  attentionItems,
  duesSchedule,
  funnelCounts,
  mergeActivity,
  safeAdminBack,
  type ActivityRow,
} from "@/lib/admin-home";

describe("admin command center", () => {
  it("links every attention count and marks only a positive count", () => {
    const items = attentionItems({
      awaitingDecision: 2,
      infoReplies: 0,
      paymentsDueOrFailed: 1,
      reports: 0,
      flaggedPosts: 3,
      introAndDealIssues: 0,
      followUpsDue: 4,
    });
    expect(items.map((item) => [item.label, item.href, item.hot])).toEqual([
      ["Applications awaiting a decision", "/admin/applications?filter=action", true],
      ["Needs-more-info replies", "/admin/applications?filter=review", false],
      ["Payments due or failed", "/admin/payments", true],
      ["Reports", "/admin/moderation", false],
      ["Flagged posts", "/admin/moderation", true],
      ["Introductions and deal rooms", "/admin/access", false],
      ["CRM follow-ups due", "/admin/crm?due=1", true],
    ]);
    expect(items.find((item) => item.id === "decision")?.count).toBe(2);
    expect(items.find((item) => item.id === "replies")?.count).toBe(0);
  });

  it("keeps the command center exact and nested admin links active", () => {
    expect(adminLinkActive("/admin", "/admin")).toBe(true);
    expect(adminLinkActive("/admin/applications", "/admin")).toBe(false);
    expect(adminLinkActive("/admin/applications/abc", "/admin/applications")).toBe(true);
    expect(adminLinkActive("/admin/crm/person", "/admin/crm")).toBe(true);
    expect(adminLinkActive("/admin/application", "/admin/applications")).toBe(false);
  });

  it("groups the left navigation in the requested order", () => {
    expect(ADMIN_GROUPS.map((group) => group.label)).toEqual([
      "Applications & Verification",
      "Members",
      "Payments",
      "CRM",
      "Email templates & Outbox",
      "Moderation",
      "Content/Legal versions",
      "Help",
      "Settings",
      "Audit log",
      "Test console",
    ]);
    expect(ADMIN_GROUPS.find((group) => group.label === "Settings")?.links.map((link) => link.href)).toEqual([
      "/admin/settings",
      "/admin/sources",
    ]);
  });

  it("orders the audit feed newest first and keeps twelve", () => {
    const rows: ActivityRow[] = Array.from({ length: 15 }, (_, index) => ({
      id: String(index),
      at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      kind: index % 2 === 0 ? "decision" : "moderation",
      text: `row ${index}`,
      href: "/admin/audit",
    }));
    const merged = mergeActivity(rows);
    expect(merged).toHaveLength(12);
    expect(merged[0]?.id).toBe("14");
    expect(merged[11]?.id).toBe("3");
    expect(merged.map((row) => row.at)).toEqual([...merged.map((row) => row.at)].sort((a, b) => (a < b ? 1 : -1)));
  });

  it("reads the flat dues schedule from the role amounts", () => {
    const schedule = duesSchedule();
    expect(schedule.find((row) => row.role === "DEVELOPER")?.cents).toBe(0);
    expect(schedule.find((row) => row.role === "INVESTOR_PE")?.cents).toBe(0);
    expect(schedule.find((row) => row.role === "FAMILY_OFFICE")?.cents).toBe(0);
    expect(schedule.find((row) => row.role === "LENDER")?.cents).toBe(0);
    expect(schedule.find((row) => row.role === "GENERAL_CONTRACTOR")?.cents).toBe(240000);
    expect(schedule.find((row) => row.role === "BROKER")?.cents).toBe(180000);
    expect(schedule.find((row) => row.role === "MORTGAGE_BROKER")?.cents).toBe(180000);
    expect(schedule.find((row) => row.role === "RE_ATTORNEY")?.cents).toBe(120000);
    expect(schedule.find((row) => row.role === "GENERAL_CONTRACTOR")?.text).toBe("$2,400 a year");
  });

  it("rolls the funnel and the seven-day window without a database", () => {
    expect(
      funnelCounts(
        [
          { status: "PENDING", count: 1 },
          { status: "SUBMITTED", count: 2 },
          { status: "IN_REVIEW", count: 3 },
          { status: "NEEDS_INFO", count: 1 },
          { status: "APPROVED", count: 4 },
          { status: "PAYMENT_DUE", count: 1 },
          { status: "DECLINED", count: 2 },
          { status: "REJECTED", count: 1 },
        ],
        9,
      ),
    ).toEqual([
      { label: "Submitted", value: 3 },
      { label: "In review", value: 4 },
      { label: "Approved", value: 4 },
      { label: "Payment due", value: 1 },
      { label: "Declined", value: 3 },
      { label: "Active members", value: 9 },
    ]);
    const now = new Date("2026-10-24T12:00:00.000Z");
    expect(activitySince(now).toISOString()).toBe("2026-10-17T12:00:00.000Z");
  });

  it("keeps delivery redirects inside admin", () => {
    expect(safeAdminBack("/admin/settings")).toBe("/admin/settings");
    expect(safeAdminBack("/admin")).toBe("/admin");
    expect(safeAdminBack("https://evil.example/admin/settings")).toBe("/admin/templates");
    expect(safeAdminBack("/admin/../settings")).toBe("/admin/templates");
    expect(safeAdminBack("/admin/settings?next=https://evil.example")).toBe("/admin/templates");
    expect(safeAdminBack("")).toBe("/admin/templates");
  });
});
