import { describe, expect, it } from "vitest";
import { splitTradeOpportunities } from "../src/lib/bid-opportunities";

const now = new Date("2026-11-17T12:00:00Z");
const request = (id: string, overrides: Partial<{ trade: string; status: string; dueAt: Date; createdAt: Date; bids: { status: string }[] }> = {}) => ({
  id, trade: "electrical", status: "OPEN", dueAt: new Date("2026-12-01"), createdAt: new Date("2026-11-01"),
  project: { name: "Project", location: "NY" }, requester: { name: "GC", org: "Company", role: "GC" }, bids: [], ...overrides,
});

describe("splitTradeOpportunities", () => {
  it("moves received packages and drafts to opportunities, deduplicated and newest first", () => {
    const fresh = request("fresh", { createdAt: new Date("2026-11-10") });
    const draft = request("draft", { bids: [{ status: "DRAFT" }] });
    const result = splitTradeOpportunities([{ request: fresh }, { request: draft }], [fresh, request("open")], now);
    expect(result.opportunities.map(({ id, opportunityStatus }) => [id, opportunityStatus])).toEqual([
      ["fresh", "NEW"], ["open", "NEW"], ["draft", "DRAFT"],
    ]);
    expect(result.toDo).toEqual([]);
  });

  it("keeps non-trade, closed and past-due requests in toDo and excludes submitted bids", () => {
    const rows = [
      request("submitted", { bids: [{ status: "SUBMITTED" }] }),
      request("closed", { status: "CLOSED" }),
      request("past", { dueAt: now }),
      request("template", { trade: "" }),
    ].map((request) => ({ request }));
    const result = splitTradeOpportunities(rows, [rows[0].request], now);
    expect(result.opportunities).toEqual([]);
    expect(result.toDo.map(({ request }) => request.id)).toEqual(["closed", "past", "template"]);
  });
});
