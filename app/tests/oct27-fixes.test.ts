import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/brand";
import { failedPaymentNotice } from "@/lib/payment-record";
import { isKnownAppPath } from "@/lib/http-document";
import { memberListVerificationLabel } from "@/lib/verification";

const ROOT = path.resolve(__dirname, "../src");

describe("October 27 display fixes", () => {
  it("follows the verification file on the members list", () => {
    const now = new Date("2026-10-27T16:00:00.000Z");
    expect(memberListVerificationLabel({ status: "VERIFIED", expiresAt: null }, now)).toBe("Verified");
    expect(memberListVerificationLabel({ status: "IN_REVIEW", expiresAt: null }, now)).toBe("In review");
    expect(memberListVerificationLabel({ status: "NEEDS_INFO", expiresAt: null }, now)).toBe("Needs info");
    expect(memberListVerificationLabel({ status: "REJECTED", expiresAt: null }, now)).toBe("Rejected");
    expect(
      memberListVerificationLabel({ status: "VERIFIED", expiresAt: new Date("2026-10-01T00:00:00.000Z") }, now),
    ).toBe("Expired");
    expect(memberListVerificationLabel(null, now)).toBe("Not started");
    const page = readFileSync(path.join(ROOT, "app/(app)/admin/members/page.tsx"), "utf8");
    expect(page).toContain("memberListVerificationLabel");
    expect(page).not.toContain("VerifiedMark");
    expect(page).not.toContain("Verification in progress");
  });

  it("says a failed payment did not go through and leaves off the next charge date", () => {
    const letter = failedPaymentNotice({
      firstName: "Alex",
      paymentLink: "https://cornicio-mvp.onrender.com/pay/preview",
    });
    expect(letter.subject).toBe("Your Private Floor payment did not go through");
    expect(letter.text).toContain("The payment did not go through.");
    expect(letter.text).toContain("Nothing was charged.");
    expect(letter.text).toContain("Pay membership dues");
    expect(letter.text.toLowerCase()).not.toContain("still need attention");
    expect(letter.text).not.toContain("Next charge date");
    expect(letter.text.toLowerCase()).not.toContain("invited");
    const record = readFileSync(path.join(ROOT, "lib/payment-record.ts"), "utf8");
    const failed = record.slice(record.indexOf("export async function markPaymentFailed"), record.indexOf("export async function sendRenewalReminder"));
    expect(failed).toContain("failedPaymentNotice");
    expect(failed).toContain('templateKey: "payment_failed"');
    expect(failed).not.toContain("dues_reminder");
    expect(failed).not.toContain("renewalDate");
  });

  it("uses the long date on the pay page, status page, receipt, and payments", () => {
    const files = [
      "components/application-status.tsx",
      "components/pay-dues.tsx",
      "lib/payment-record.ts",
      "app/(app)/admin/payments/page.tsx",
      "components/payment-admin.tsx",
      "app/(app)/settings/page.tsx",
      "app/(app)/admin/applications/page.tsx",
      "actions/payments.ts",
    ];
    for (const file of files) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      expect(source, file).toContain("formatLongEtDate");
      expect(source, file).not.toContain("formatEtDate");
    }
  });

  it("publishes a help page with the contact details", () => {
    expect(isKnownAppPath("/help")).toBe(true);
    expect(BRAND.contactEmail).toBe("connect@privatefloorclub.com");
    expect(BRAND.contactPhone).toBe("800-399-3745");
    const page = readFileSync(path.join(ROOT, "app/help/page.tsx"), "utf8");
    expect(page).toContain("BRAND.contactEmail");
    expect(page).toContain("BRAND.contactPhone");
    expect(page).toContain("How it works");
    const middleware = readFileSync(path.join(ROOT, "middleware.ts"), "utf8");
    expect(middleware).toContain('"/help"');
    const home = readFileSync(path.join(ROOT, "app/page.tsx"), "utf8");
    expect(home).toContain('href="/help"');
  });
});
