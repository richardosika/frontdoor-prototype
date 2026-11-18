import { beforeEach, describe, expect, it, vi } from "vitest";

const created: { outbox: any[]; notifications: any[] } = { outbox: [], notifications: [] };
vi.mock("@/lib/prisma", () => ({
  prisma: {
    mailSettings: { findUnique: vi.fn(async () => null) },
    crmPerson: { findUnique: vi.fn(async () => null) },
    outboxNotice: { create: vi.fn(async ({ data }: any) => { created.outbox.push(data); return { id: `o${created.outbox.length}`, ...data }; }), update: vi.fn() },
    user: { findMany: vi.fn(async () => [{ id: "admin1" }, { id: "admin2" }]) },
    notification: { create: vi.fn(async ({ data }: any) => { created.notifications.push(data); return data; }) },
  },
}));
vi.mock("@/lib/crm", () => ({ recordCrmEvent: vi.fn(async () => undefined) }));
vi.mock("@/lib/server-work", () => ({ runOnServer: vi.fn() }));

import { deliverAdminNotice, newApplicationAdminNotice, paymentReceivedAdminNotice } from "@/lib/admin-alerts";

const banned = /invite|invited|invite-only|founding member|limited/i;

describe("admin new-application and payment notices", () => {
  beforeEach(() => {
    created.outbox = [];
    created.notifications = [];
    process.env.NOTICE_TEST_RECIPIENT = "rich@privatefloorclub.com";
  });

  it("builds the new application subject, details, and link", () => {
    const n = newApplicationAdminNotice({ base: "https://x.test/", applicationId: "app1", name: "Ada Lane", role: "Developer", company: "Lane Co", email: "ada@lane.co", location: "Miami, FL", referralCode: "ABC" });
    expect(n.subject).toBe("New application: Ada Lane · Developer · Lane Co");
    expect(n.text).toContain("Open the application: https://x.test/admin/applications/app1");
    expect(n.text).toContain("Email: ada@lane.co");
    expect(n.alert.href).toBe("/admin/applications/app1");
    expect(`${n.subject}\n${n.text}\n${n.alert.body}`).not.toMatch(banned);
  });

  it("builds the payment subject and member link", () => {
    const n = paymentReceivedAdminNotice({ base: "https://x.test", userId: "u1", name: "Ada Lane", email: "ada@lane.co", amount: "$250", role: "Developer", mode: "stripe", first: true });
    expect(n.subject).toBe("Payment received: Ada Lane · $250");
    expect(n.text).toContain("Open the member: https://x.test/admin/members/u1");
    expect(n.alert.href).toBe("/admin/members/u1");
    expect(`${n.subject}\n${n.text}`).not.toMatch(banned);
  });

  it("stores an Outbox row for the test recipient and alerts each active admin", async () => {
    const n = paymentReceivedAdminNotice({ base: "https://x.test", userId: "u1", name: "Ada Lane", email: "ada@lane.co", amount: "$250", role: "Developer", mode: "manual", first: true });
    await deliverAdminNotice(n, { templateKey: "admin_payment_received" });
    expect(created.outbox).toHaveLength(1);
    expect(created.outbox[0].intendedTo).toBe("rich@privatefloorclub.com");
    expect(created.outbox[0].deliveredTo).toBe("rich@privatefloorclub.com");
    expect(created.outbox[0].subject).toBe("Payment received: Ada Lane · $250");
    expect(created.outbox[0].templateKey).toBe("admin_payment_received");
    expect(created.notifications.map((x) => x.userId)).toEqual(["admin1", "admin2"]);
    expect(created.notifications.every((x) => x.audience === "admin")).toBe(true);
  });
});
