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

  it("does not tell a member that a vouch changes them to Confirmed", () => {
    const watched = [
      "actions/profile.ts",
      "actions/admin.ts",
      "app/confirm/[token]/page.tsx",
      "lib/verification-db.ts",
      "app/(app)/admin/members/page.tsx",
    ];
    const banned = [/promoting to Confirmed/, /tier stays/, /tier can change/, /before the tier change/, /Tier unchanged/, /Invited or Confirmed/];
    const hits: string[] = [];
    for (const relative of watched) {
      const text = readFileSync(path.join(ROOT, relative), "utf8");
      for (const pattern of banned) {
        if (pattern.test(text)) hits.push(`${relative}: ${pattern}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
