import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DUES_DUE_NOW_NOTE } from "@/lib/dues";
import { templateDef } from "@/lib/email-templates";
import { MEMBERSHIP_PHRASE } from "@/lib/membership-copy";

const ROOT = path.resolve(__dirname, "../src");
const BANNED = /invite-only|by invitation|founding member|\blimited\b|\binvite\b|\binvited\b|\$|\bdues\b|\bprice\b|per month/i;

describe("free-role welcome and the unpaid pay page", () => {
  it("welcomes a free role with no money and no invite wording", () => {
    const welcome = templateDef("welcome");
    expect(welcome?.subject).toBe("Welcome to Private Floor");
    expect(welcome?.body).toContain(MEMBERSHIP_PHRASE);
    expect(welcome?.body).toContain("Your membership is active.");
    expect(welcome?.body).toContain("Sign in");
    expect(welcome?.body || "").not.toMatch(BANNED);
    const decision = readFileSync(path.join(ROOT, "actions/admin.ts"), "utf8");
    const branch = decision.slice(decision.indexOf("if (paying && paymentToken)"));
    expect(branch).toContain('key: "payment_due"');
    expect(branch).toContain('key: "welcome"');
    expect(branch).not.toContain('key: "approved"');
  });

  it("tells an approved unpaid member that dues are due now", () => {
    expect(DUES_DUE_NOW_NOTE).toContain("Dues are due now to activate your membership.");
    expect(DUES_DUE_NOW_NOTE).not.toContain("Due only after approval");
    const pay = readFileSync(path.join(ROOT, "components/pay-dues.tsx"), "utf8");
    expect(pay).toContain("DUES_DUE_NOW_NOTE");
    expect(pay).toContain("<DuesLanguages dueNow />");
    expect(pay).not.toContain("Due only after approval");
  });
});
