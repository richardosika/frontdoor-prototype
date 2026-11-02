import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scopedHelpKey } from "@/lib/help/store";

describe("help chat privacy", () => {
  it("scopes history to the signed-in person", () => {
    const browser = "abcdefghijklmnopqrstuvwx";
    expect(scopedHelpKey(browser, "userA")).not.toBe(scopedHelpKey(browser, "userB"));
    expect(scopedHelpKey(browser, null)).toBe(browser);
    expect(scopedHelpKey("", "userA")).toBe("");
  });
  it("resets the help key on sign-in and sign-out and remounts per viewer", () => {
    const auth = readFileSync("src/actions/auth.ts", "utf8");
    expect(auth.match(/resetHelpChat\(\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(readFileSync("src/app/layout.tsx", "utf8")).toContain("<HelpWidget key={viewer}");
    expect(readFileSync("src/app/api/help/route.ts", "utf8")).toContain("scopedHelpKey(sessionKey, user?.id)");
  });
});
