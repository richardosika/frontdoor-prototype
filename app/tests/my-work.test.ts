import { describe, expect, it } from "vitest";
import { inTalks } from "@/lib/my-work";
import { gettingStarted } from "@/lib/member-reach";

const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000);
describe("#44 My work right now", () => {
  it("labels open requests Sent / Received and keeps recent accepted ones", () => {
    const rows = [
      { id: "a", status: "PENDING", fromId: "me", createdAt: d(1) },
      { id: "b", status: "PENDING", fromId: "dev", createdAt: d(2) },
      { id: "c", status: "ACCEPTED", fromId: "me", createdAt: d(30), decidedAt: d(3) },
      { id: "e", status: "ACCEPTED", fromId: "me", createdAt: d(40), decidedAt: d(30) },
      { id: "f", status: "DECLINED", fromId: "me", createdAt: d(1) },
    ];
    expect(inTalks(rows, "me").map((r) => [r.id, r.state])).toEqual([["a", "Sent"], ["b", "Received"], ["c", "Accepted"]]);
  });
  it("Getting started past-work step points to profile Past work", () => {
    const items = gettingStarted({ role: "GENERAL_CONTRACTOR", profileDone: true, ndaAccepted: true, projectCount: 0, seekingSet: false, approvedProject: false, projectPending: false, outreachSent: 0, hasPhoto: false, hasCredential: true } as never);
    expect(items.find((i) => i.id === "work")?.href).toBe("/profile#past-work");
  });
});

import { valueHeadline } from "@/lib/my-work";
describe("#44 value headline", () => {
  it("sums stated values and counts developers with open requests to me", () => {
    const h = valueHeadline({
      allSeeking: [{ valueLabel: "$18,000,000" }, { valueLabel: "24000000" }, { valueLabel: "" }],
      received: [
        { status: "PENDING", fromId: "dev1", project: { userId: "dev1" } },
        { status: "PENDING", fromId: "dev1", project: { userId: "dev1" } },
        { status: "ACCEPTED", fromId: "dev2", project: { userId: "dev2" } },
        { status: "PENDING", fromId: "other", project: { userId: "me" } },
      ],
    });
    expect(h).toEqual({ projects: 3, total: 42000000, developers: 1 });
  });
});
