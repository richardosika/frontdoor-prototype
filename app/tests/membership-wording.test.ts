import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { APPLICATION_RECEIVED_TEMPLATE } from "@/lib/applicant-copy";
import { TEMPLATE_DEFS, templateDef } from "@/lib/email-templates";
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

  it("keeps the email templates on the approved wording", () => {
    const banned = [/you're invited/i, /invite-only/i, /by invitation/i, /request an invite/i];
    const hits: string[] = [];
    for (const item of TEMPLATE_DEFS) {
      const text = `${item.subject}\n${item.body}`;
      for (const pattern of banned) {
        if (pattern.test(text)) hits.push(`${item.key}: ${pattern}`);
      }
    }
    expect(hits).toEqual([]);
    const info = templateDef("info");
    expect(info?.subject).toBe("About Private Floor");
    expect(info?.body).toContain(MEMBERSHIP_PHRASE);
    expect(info?.body).toContain(JOIN_CTA);
    expect(info?.body.toLowerCase()).not.toContain("invited");
    const thanks = templateDef("invite_received");
    expect(thanks?.subject).toBe("Thank you for applying to Private Floor");
    expect(thanks?.body).toContain(APPLICATION_RECEIVED_TEMPLATE);
    expect(templateDef("application_thanks")?.body).toContain(APPLICATION_RECEIVED_TEMPLATE);
  });
});
