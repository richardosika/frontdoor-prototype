import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canMessage,
  inboxResponse,
  memberDirectoryResponse,
  moderationDenial,
  moderationQueueResponse,
  moderationThreadResponse,
  portalMessageEmail,
  RATE_LIMITS,
  toPublicMember,
  vouchDelivery,
  withinRateLimit,
  type MemberRecord,
} from "@/lib/messaging";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  userFind: vi.fn(),
  conversationFindMany: vi.fn(),
  conversationFind: vi.fn(),
  groupBy: vi.fn(),
  eventCreate: vi.fn(),
}));

vi.mock("@/lib/current-user", () => ({
  verificationActor: mocks.actor,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFind },
    conversation: { findMany: mocks.conversationFindMany, findUnique: mocks.conversationFind },
    message: { groupBy: mocks.groupBy },
    moderationEvent: { create: mocks.eventCreate },
  },
}));

import { GET as getMember } from "@/app/api/members/[id]/route";
import { GET as getInbox } from "@/app/api/messages/route";
import { GET as getModerationQueue } from "@/app/api/admin/messages/route";
import { GET as getModerationThread } from "@/app/api/admin/messages/[id]/route";

const ada: MemberRecord = {
  id: "ada",
  name: "Ada Lovelace",
  initials: "AL",
  org: "Analytical Engines",
  location: "Newark, NJ",
  role: "DEVELOPER",
  tier: "VERIFIED",
  bio: "Builds lofts.",
  credentialNote: "Entity on file",
  email: "ada@example.com",
  phone: "201-555-0199",
  linkedinUrl: "https://www.linkedin.com/in/ada-example",
};

const privateBits = ["ada@example.com", "201-555-0199", "linkedin.com/in/ada-example"];

function expectNoPrivateContact(body: string) {
  for (const secret of privateBits) expect(body).not.toContain(secret);
}

describe("portal messaging rules", () => {
  it("sends only the generic message notice", () => {
    const mail = portalMessageEmail("https://floor.example/messages");
    expect(mail.subject).toBe("You have a new message on Private Floor");
    expect(mail.text).toContain("You have a new message on Private Floor.");
    expect(mail.text).toContain("Open messages\nhttps://floor.example/messages");
    expectNoPrivateContact(`${mail.subject}\n${mail.text}`);
    expect(mail.text).not.toContain("Can you send the latest numbers?");
    expect(mail.text).not.toContain("Ada Lovelace");
  });

  it("keeps a vouch inside the portal or on a guest link, never in email", () => {
    expect(vouchDelivery({ counterpartyIsMember: true })).toEqual({ channel: "portal", sendsEmail: false });
    expect(vouchDelivery({ counterpartyIsMember: false })).toEqual({ channel: "guest-link", sendsEmail: false });
  });

  it("blocks closed pairs and enforces limits", () => {
    expect(canMessage({ fromId: "a", toId: "b", blockedEitherWay: true }).ok).toBe(false);
    expect(canMessage({ fromId: "a", toId: "a", blockedEitherWay: false }).ok).toBe(false);
    expect(canMessage({ fromId: "a", toId: "b", blockedEitherWay: false }).ok).toBe(true);
    expect(withinRateLimit(RATE_LIMITS.messagesPerHour - 1, RATE_LIMITS.messagesPerHour)).toBe(true);
    expect(withinRateLimit(RATE_LIMITS.messagesPerHour, RATE_LIMITS.messagesPerHour)).toBe(false);
    expect(withinRateLimit(RATE_LIMITS.reportsPerDay, RATE_LIMITS.reportsPerDay)).toBe(false);
  });

  it("hides moderation from anonymous callers and signed-in members", () => {
    expect(moderationDenial({ path: "/admin/messages", actor: null })).toBe(404);
    expect(moderationDenial({ path: "/api/admin/messages", actor: null })).toBe(404);
    expect(moderationDenial({ path: "/api/admin/messages/thread", actor: { isAdmin: false } })).toBe(403);
    expect(moderationDenial({ path: "/admin/messages/thread", actor: { isAdmin: false } })).toBe(404);
    expect(moderationDenial({ path: "/messages", actor: { isAdmin: false } })).toBeNull();
    expect(moderationDenial({ path: "/api/admin/messages", actor: { isAdmin: true } })).toBeNull();
  });
});

describe("member endpoints omit private contact", () => {
  beforeEach(() => {
    mocks.actor.mockReset();
    mocks.userFind.mockReset();
    mocks.conversationFindMany.mockReset();
    mocks.conversationFind.mockReset();
    mocks.groupBy.mockReset();
    mocks.eventCreate.mockReset();
    mocks.eventCreate.mockResolvedValue({ id: "event" });
    mocks.groupBy.mockResolvedValue([]);
  });

  it("does not return another member's email, phone, or LinkedIn to a non-admin", async () => {
    mocks.actor.mockResolvedValue({ id: "viewer", name: "Viewer", isAdmin: false, status: "ACTIVE" });
    mocks.userFind.mockResolvedValue(ada);
    const response = await getMember(new Request("http://localhost/api/members/ada"), { params: Promise.resolve({ id: "ada" }) });
    expect(response.status).toBe(200);
    const body = await response.text();
    expectNoPrivateContact(body);
    const json = JSON.parse(body);
    expect(json.name).toBe("Ada Lovelace");
    expect(json.email).toBeUndefined();
    expect(json.phone).toBeUndefined();
    expect(json.linkedinUrl).toBeUndefined();
    expect(Object.keys(toPublicMember(ada))).not.toContain("email");
    expect(Object.keys(toPublicMember(ada))).not.toContain("phone");
    expect(Object.keys(toPublicMember(ada))).not.toContain("linkedinUrl");
  });

  it("returns contact fields to an admin on the member endpoint only", async () => {
    mocks.actor.mockResolvedValue({ id: "admin", name: "Marcus Hale", isAdmin: true, status: "ACTIVE" });
    mocks.userFind.mockResolvedValue(ada);
    const response = await getMember(new Request("http://localhost/api/members/ada"), { params: Promise.resolve({ id: "ada" }) });
    const json = await response.json();
    expect(json.email).toBe(ada.email);
    expect(json.phone).toBe(ada.phone);
    expect(json.linkedinUrl).toBe(ada.linkedinUrl);
  });

  it("keeps the inbox free of other members' contact details", async () => {
    mocks.actor.mockResolvedValue({ id: "viewer", name: "Viewer", isAdmin: true, status: "ACTIVE" });
    mocks.conversationFindMany.mockResolvedValue([
      {
        id: "thread",
        userAId: "viewer",
        userBId: "ada",
        userA: { ...ada, id: "viewer", email: "viewer@example.com", phone: "201-555-0100" },
        userB: ada,
        messages: [{ body: "Can you send the latest numbers?" }],
      },
    ]);
    const response = await getInbox();
    const body = await response.text();
    expect(response.status).toBe(200);
    expectNoPrivateContact(body);
    expect(body).not.toContain("viewer@example.com");
    expect(body).not.toContain("201-555-0100");
    expect(body).toContain("Can you send the latest numbers?");
  });

  it("refuses the moderation API to non-admins without returning contact details", async () => {
    mocks.actor.mockResolvedValue(null);
    const anonymous = await getModerationQueue(new Request("http://localhost/api/admin/messages"));
    expect(anonymous.status).toBe(404);
    expectNoPrivateContact(await anonymous.text());

    mocks.actor.mockResolvedValue({ id: "viewer", name: "Viewer", isAdmin: false, status: "ACTIVE" });
    mocks.conversationFindMany.mockResolvedValue([]);
    const member = await getModerationQueue(new Request("http://localhost/api/admin/messages"));
    expect(member.status).toBe(403);
    expect(await member.text()).toBe("Forbidden");
    expect(mocks.conversationFindMany).not.toHaveBeenCalled();

    const thread = await getModerationThread(new Request("http://localhost/api/admin/messages/thread"), {
      params: Promise.resolve({ id: "thread" }),
    });
    expect(thread.status).toBe(403);
    expectNoPrivateContact(await thread.text());
  });

  it("shows contact details on the admin moderation payload", () => {
    const queue = moderationQueueResponse({
      viewer: { isAdmin: true },
      threads: [{ id: "thread", updatedAt: "2026-10-24T00:00:00.000Z", preview: "Hello", members: [ada] }],
    });
    return queue.json().then((json) => {
      expect(json.threads[0].members[0].email).toBe(ada.email);
      expect(json.threads[0].members[0].phone).toBe(ada.phone);
    });
  });
});

describe("response builders", () => {
  it("returns 404 when the directory caller is anonymous", async () => {
    const response = memberDirectoryResponse({ viewer: null, subject: ada });
    expect(response.status).toBe(404);
    expectNoPrivateContact(await response.text());
    const inbox = inboxResponse({ viewer: null, threads: [{ id: "t", preview: "secret", unread: 1, member: ada }] });
    expect(inbox.status).toBe(404);
    const thread = moderationThreadResponse({
      viewer: { isAdmin: false },
      thread: { id: "t", messages: [{ id: "m", body: "Hi", kind: "TEXT", createdAt: "2026-10-24T00:00:00.000Z", sender: ada }] },
    });
    expect(thread.status).toBe(403);
    expectNoPrivateContact(await thread.text());
  });
});
