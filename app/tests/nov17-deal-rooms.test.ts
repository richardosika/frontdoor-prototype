import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildDealRoomRows } from "../src/lib/my-deal-rooms";
import { phrase } from "../src/lib/i18n/phrases";
import { NOV16_PHRASES } from "../src/lib/i18n/nov16-phrases";

const date = (day: number) => new Date(2026, 10, day);
const deal = (id: string, day: number) => ({ id, title: `Title ${id}`, project: null, createdAt: date(day) });
const owned = (id: string, day: number, count = 0) => ({ ...deal(id, day), _count: { access: count } });
const access = (id: string, day: number, status = "APPROVED", sponsorId = "other") => ({
  status, createdAt: date(day), deal: { ...deal(id, 1), sponsor: { id: sponsorId, name: "Room owner" } },
});

describe("My Deal Rooms", () => {
  it("orders owners, approved and pending, newest first in each group", () => {
    const rows = buildDealRoomRows("me", [owned("o1", 1), owned("o2", 2)], [
      access("p1", 3, "PENDING"), access("a1", 4), access("p2", 5, "PENDING"), access("a2", 6),
    ]);
    expect(rows.map((row) => row.id)).toEqual(["o2", "o1", "a2", "a1", "p2", "p1"]);
    expect(rows.map((row) => row.state)).toEqual(["OWNER", "OWNER", "APPROVED", "APPROVED", "PENDING", "PENDING"]);
  });

  it("deduplicates owned rooms and hides declined access", () => {
    expect(buildDealRoomRows("me", [owned("own", 1)], [access("own", 3, "APPROVED", "me"), access("no", 4, "DECLINED")]))
      .toEqual([{ id: "own", name: "Title own", owner: null, state: "OWNER", pendingRequests: 0, href: "/deals/own/room" }]);
  });

  it("uses project names with a title fallback, correct links and owner-only pending counts", () => {
    const rows = buildDealRoomRows("me", [{ ...owned("own", 1, 3), project: { name: "Project name" } }], [access("yes", 3), access("wait", 4, "PENDING")]);
    expect(rows[0]).toMatchObject({ name: "Project name", pendingRequests: 3, owner: null, href: "/deals/own/room" });
    expect(rows[1]).toMatchObject({ name: "Title yes", pendingRequests: 0, owner: { id: "other", name: "Room owner" }, href: "/deals/yes/room" });
    expect(rows[2]).toMatchObject({ pendingRequests: 0, href: "/deals/wait" });
    expect(buildDealRoomRows("me", [], [])).toEqual([]);
  });

  it("loads and renders only in the unlocked main column for every role", () => {
    const page = readFileSync("src/app/(app)/feed/page.tsx", "utf8");
    expect(page).toContain("const dealRooms = locked ? [] : await loadMyDealRooms(user)");
    const main = page.slice(page.indexOf('{locked ? (', page.indexOf('{note}')), page.indexOf("<aside"));
    expect(main).toMatch(/\{locked \? \([\s\S]*?\) : \(\s*<>\s*<LedgerProjects[\s\S]*?\/>\s*<MyDealRooms rows=\{dealRooms\} \/>\s*<\/>/);
    expect(page.slice(page.indexOf("<aside"))).not.toContain("MyDealRooms");
  });

  it("translates all section copy through phrase for es, de and ja", () => {
    const component = readFileSync("src/components/my-deal-rooms.tsx", "utf8");
    for (const text of ["My Deal Rooms", "Owner: {name}", "You own this room", "Access approved", "Access requested", "1 access request waiting", "{n} access requests waiting", "Open Deal Room", "View request"]) {
      expect(component).toContain(`"${text}"`);
      for (const locale of ["es", "de", "ja"] as const) {
        expect(phrase(locale, text).trim()).not.toBe("");
        expect(phrase(locale, text)).not.toBe(text);
      }
    }
    for (const text of ["My Deal Rooms", "Owner: {name}", "You own this room", "Access requested", "1 access request waiting", "{n} access requests waiting"]) expect(NOV16_PHRASES[text]).toHaveLength(3);
    expect(component).toContain('if (!rows.length) return null');
    expect(component).toContain("min-h-11");
    expect(component).toContain("sm:flex-row");
    expect(component).toContain("[overflow-wrap:anywhere]");
  });
});
