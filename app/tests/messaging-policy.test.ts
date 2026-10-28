import { describe, expect, it } from "vitest";
import {
  DECLINE_SENDER_LINE,
  activeMessagingRestriction,
  blocksEitherWay,
  canStartThread,
  declineSenderNotice,
  digestNotice,
  introDailyCap,
  introRequestDecision,
  noticeHasMessageText,
  parseMessagingSettings,
  threadEmailPlan,
  MESSAGING_DEFAULTS,
} from "@/lib/platform/messaging-policy";

const now = new Date("2026-10-28T15:00:00Z");
const settings = MESSAGING_DEFAULTS;
const note = "Can you look at the Phoenix storage site this week?";

describe("introduction requests", () => {
  it("uses a lower daily cap for a new account and refuses a recent refusal", () => {
    expect(introDailyCap({ accountCreatedAt: new Date("2026-10-20T15:00:00Z"), now, settings })).toBe(5);
    expect(introDailyCap({ accountCreatedAt: new Date("2026-01-01T00:00:00Z"), now, settings })).toBe(10);
    const fresh = introRequestDecision({
      sentToday: 5,
      outstanding: 0,
      accountCreatedAt: new Date("2026-10-20T15:00:00Z"),
      now,
      lastDeclinedAt: null,
      settings,
    });
    expect(fresh.ok).toBe(false);
    const waiting = introRequestDecision({
      sentToday: 0,
      outstanding: 25,
      accountCreatedAt: new Date("2026-01-01T00:00:00Z"),
      now,
      lastDeclinedAt: null,
      settings,
    });
    expect(waiting.ok).toBe(false);
    const again = introRequestDecision({
      sentToday: 0,
      outstanding: 0,
      accountCreatedAt: new Date("2026-01-01T00:00:00Z"),
      now,
      lastDeclinedAt: new Date("2026-10-01T00:00:00Z"),
      settings,
    });
    expect(again.ok).toBe(false);
    const later = introRequestDecision({
      sentToday: 9,
      outstanding: 1,
      accountCreatedAt: new Date("2026-01-01T00:00:00Z"),
      now,
      lastDeclinedAt: new Date("2026-01-01T00:00:00Z"),
      settings,
    });
    expect(later.ok).toBe(true);
  });

  it("tells the sender only that the person is not available now", () => {
    const notice = declineSenderNotice();
    expect(notice.title).toBe(DECLINE_SENDER_LINE);
    expect(notice.body).toBe("Not available now");
    expect(`${notice.title} ${notice.body}`).not.toMatch(/declined|grade|score/i);
  });

  it("opens a new thread only after an introduction is accepted", () => {
    expect(canStartThread({ hasConversation: false, introStatus: "PENDING" }).ok).toBe(false);
    expect(canStartThread({ hasConversation: false, introStatus: null }).ok).toBe(false);
    expect(canStartThread({ hasConversation: false, introStatus: "ACCEPTED" }).ok).toBe(true);
    expect(canStartThread({ hasConversation: true, introStatus: null }).ok).toBe(true);
  });
});

describe("thread email", () => {
  const inbox = "https://floor.example/messages";

  it("sends the first message and a request with no message text", () => {
    const first = threadEmailPlan({ isRequest: false, mode: "THROTTLED", lastSentAt: null, now, windowMinutes: 240, inboxUrl: inbox });
    const request = threadEmailPlan({ isRequest: true, mode: "INSTANT", lastSentAt: now, now, windowMinutes: 240, inboxUrl: inbox });
    expect(first.deliver).toBe("send");
    expect(request.deliver).toBe("send");
    expect(noticeHasMessageText(first.text, note)).toBe(false);
    expect(noticeHasMessageText(request.text, note)).toBe(false);
    expect(request.text).not.toMatch(/grade|score|phone/i);
    expect(digestNotice(inbox).text).not.toContain(note);
  });

  it("holds a later message inside the window and sends after it", () => {
    const held = threadEmailPlan({
      isRequest: false,
      mode: "THROTTLED",
      lastSentAt: new Date(now.getTime() - 60 * 60 * 1000),
      now,
      windowMinutes: 240,
      inboxUrl: inbox,
    });
    expect(held.deliver).toBe("hold");
    expect(held.suppressed).toBe(true);
    expect(held.text).not.toContain(note);
    const later = threadEmailPlan({
      isRequest: false,
      mode: "THROTTLED",
      lastSentAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      now,
      windowMinutes: 240,
      inboxUrl: inbox,
    });
    expect(later.deliver).toBe("send");
  });

  it("saves a daily digest and skips when email is off", () => {
    const digest = threadEmailPlan({
      isRequest: false,
      mode: "DIGEST",
      lastSentAt: new Date(now.getTime() - 60 * 60 * 1000),
      now,
      windowMinutes: 240,
      inboxUrl: inbox,
    });
    expect(digest.deliver).toBe("digest");
    expect(digest.text).not.toContain(note);
    const off = threadEmailPlan({ isRequest: false, mode: "OFF", lastSentAt: null, now, windowMinutes: 240, inboxUrl: inbox });
    expect(off.deliver).toBe("skip");
  });

  it("reads administrator caps and falls back to the defaults", () => {
    const parsed = parseMessagingSettings([{ key: "intro.daily", value: { n: 4 } }]);
    expect(parsed.introDaily).toBe(4);
    expect(parsed.threadWindowMinutes).toBe(240);
    expect(parsed.messageHourly).toBe(30);
  });
});

describe("blocks, reports, and restrictions", () => {
  it("treats a block in either direction as closed", () => {
    expect(blocksEitherWay([{ blockerId: "a", blockedId: "b" }], "b", "a")).toBe(true);
    expect(blocksEitherWay([{ blockerId: "a", blockedId: "b" }], "a", "c")).toBe(false);
  });

  it("pauses or suspends messaging until the end time", () => {
    expect(
      activeMessagingRestriction([{ kind: "MESSAGING_PAUSED", startsAt: new Date("2026-10-01"), endsAt: null }], now),
    ).toBe("MESSAGING_PAUSED");
    expect(
      activeMessagingRestriction(
        [
          { kind: "MESSAGING_PAUSED", startsAt: new Date("2026-10-01"), endsAt: null },
          { kind: "MESSAGING_SUSPENDED", startsAt: new Date("2026-10-01"), endsAt: null },
        ],
        now,
      ),
    ).toBe("MESSAGING_SUSPENDED");
    expect(
      activeMessagingRestriction([{ kind: "MESSAGING_PAUSED", startsAt: new Date("2026-10-01"), endsAt: new Date("2026-10-02") }], now),
    ).toBeNull();
  });
});
