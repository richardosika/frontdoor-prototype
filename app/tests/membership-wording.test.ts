import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { JOIN_CTA, MEMBERSHIP_PHRASE, MEMBERSHIP_SHORT } from "@/lib/membership-copy";

const ROOT = path.resolve(__dirname, "../src");

function filesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return filesIn(full);
    return full;
  });
}

describe("membership wording", () => {
  it("uses the approved phrase and does not say invite-only", () => {
    expect(MEMBERSHIP_PHRASE).toBe("A private network where every member is personally reviewed");
    expect(MEMBERSHIP_SHORT).toBe("Reviewed membership");
    expect(JOIN_CTA).toBe("Request to join");
    const hits: string[] = [];
    for (const file of filesIn(ROOT)) {
      if (!/\.(ts|tsx|md)$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      if (/invite-only/i.test(text) || /by invitation/i.test(text) || /Request an invite/.test(text)) {
        hits.push(path.relative(ROOT, file));
      }
    }
    expect(hits).toEqual([]);
  });
});
