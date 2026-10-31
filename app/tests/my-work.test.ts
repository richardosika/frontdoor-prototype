import { describe, expect, it } from "vitest";
import { inTalks } from "@/lib/my-work";
import { gettingStarted } from "@/lib/member-reach";

const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000);
describe("#44 My work right now", () => {
  it("labels open requests Sent / Received and keeps recent accepted ones", () => {
    const rows = [
      { id: "a", status: "PENDING", fromId: "me", createdAt: d(1) },
      { id: "b", status: "PENDING", fromId: "dev", createdAt: d(2) },
      { id: "c", status: "ACCEPTED", fromId: "me", createdAt: d(30), respondedAt: d(3) },
      { id: "e", status: "ACCEPTED", fromId: "me", createdAt: d(40), respondedAt: d(30) },
      { id: "f", status: "DECLINED", fromId: "me", createdAt: d(1) },
    ];
    expect(inTalks(rows, "me").map((r) => [r.id, r.state])).toEqual([["a", "Sent"], ["b", "Received"], ["c", "Accepted"]]);
  });
  it("Getting started past-work step points to profile Past work", () => {
    const items = gettingStarted({ role: "GENERAL_CONTRACTOR", profileDone: true, ndaAccepted: true, projectCount: 0, seekingSet: false, approvedProject: false, projectPending: false, outreachSent: 0, hasPhoto: false, hasCredential: true } as never);
    expect(items.find((i) => i.id === "work")?.href).toBe("/profile#past-work");
  });
});
