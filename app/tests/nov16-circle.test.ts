import { describe, expect, it } from "vitest";
import { blockedIds, circleHome, circleMessageBody, renderCircleMessage, safeBack, withParam, withoutBlocked } from "@/lib/circle-requests";
import { phrase, PHRASES } from "@/lib/i18n/phrases";
import { NOV16_PHRASES } from "@/lib/i18n/nov16-phrases";

describe("Nov 16 circle requests", () => {
  it("leaves out members blocked in either direction", () => {
    const blocked = blockedIds("me", [
      { blockerId: "me", blockedId: "a" },
      { blockerId: "b", blockedId: "me" },
      { blockerId: "x", blockedId: "y" },
    ]);
    expect([...blocked].sort()).toEqual(["a", "b"]);
    expect(withoutBlocked([{ id: "a" }, { id: "b" }, { id: "c" }], blocked).map((r) => r.id)).toEqual(["c"]);
  });

  it("only accepts internal back paths", () => {
    expect(safeBack("/messages/abc")).toBe("/messages/abc");
    expect(safeBack("/deals#my-circle")).toBe("/deals#my-circle");
    expect(safeBack("//evil.example")).toBeNull();
    expect(safeBack("https://evil.example")).toBeNull();
    expect(safeBack("/\\evil")).toBeNull();
    expect(safeBack("")).toBeNull();
    expect(withParam("/deals#my-circle", "notice", "Added to My Circle.")).toBe("/deals?notice=Added+to+My+Circle.#my-circle");
  });

  it("sends developers to Find your team and everyone else to My Circle", () => {
    expect(circleHome("DEVELOPER")).toEqual({ href: "/deals#my-circle", label: "Find your team" });
    expect(circleHome("GENERAL_CONTRACTOR")).toEqual({ href: "/network#circle-requests", label: "My Circle" });
    expect(circleMessageBody("request", "Julia Hart", "SUBCONTRACTOR")).toBe("Julia Hart asked to join your circle. Accept or decline in My Circle.");
    expect(circleMessageBody("request", "Julia Hart", "DEVELOPER")).toBe("Julia Hart asked to join your circle. Accept or decline in Find your team.");
  });

  it("rewrites old Network messages and translates them", () => {
    const en = (t: string) => t;
    expect(renderCircleMessage("Julia Hart requested to connect. Accept or decline in Network.", "GENERAL_CONTRACTOR", en)).toBe(
      "Julia Hart asked to join your circle. Accept or decline in My Circle.",
    );
    const es = (t: string) => phrase("es", t);
    expect(renderCircleMessage("Julia Hart requested to connect. Accept or decline in Network.", "DEVELOPER", es)).toBe(
      "Julia Hart pidió unirse a su círculo. Acepte o rechace en Encuentre su equipo.",
    );
    expect(renderCircleMessage("Anthony Russo accepted your connection request.", "GENERAL_CONTRACTOR", (t) => phrase("ja", t))).toBe(
      "Anthony Russoさんがつながりのリクエストを承諾しました。",
    );
    expect(renderCircleMessage("Hello there", "GENERAL_CONTRACTOR", es)).toBe("Hello there");
  });

  it("has Spanish, German and Japanese for every new phrase, without restricted words", () => {
    for (const [key, values] of Object.entries(NOV16_PHRASES)) {
      expect(PHRASES[key]).toBeDefined();
      expect(values.every((v) => v.trim().length > 0)).toBe(true);
      expect(`${key} ${values.join(" ")}`).not.toMatch(/\binvit|founding member|\blimited\b/i);
    }
  });
});
