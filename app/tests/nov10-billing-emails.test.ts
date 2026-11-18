import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BILLING_EMAIL_LOCALES, cardExpiresAt, cardExpiringEmail, cardExpiryDay, cardNoticeDue, expiryKey, formatExpiry, paymentDeclinedEmail } from "@/lib/billing-emails";
import { failedPaymentNotice } from "@/lib/payment-record";

const ROOT = path.join(__dirname, "..", "src");
const BANNED = /\b(invite|invited|invite-only|founding member|limited)\b/i;

describe("Nov 10 billing emails (Julia)", () => {
  it("uses Julia's 30-day wording", () => {
    const m = cardExpiringEmail("30", { locale: "en", name: "Alex", expiresOn: cardExpiryDay(12, 2026), link: "https://x/settings#billing" });
    expect(m.text).toContain("Hi Alex,");
    expect(m.text).toContain("The credit card associated with your membership is set to expire in 30 days.");
    expect(m.text).toContain("To ensure uninterrupted access to your account and all membership benefits, please update your payment information before December 31, 2026.");
    expect(m.text).toContain("If you have any questions, we're happy to help.");
    expect(m.text).toContain("Thank you,\nThe Private Floor Club Team");
    expect(m.text).toContain("https://x/settings#billing");
  });

  it("uses Julia's 2-day wording", () => {
    const m = cardExpiringEmail("2", { locale: "en", name: "Alex", expiresOn: cardExpiryDay(11, 2026), link: "L" });
    expect(m.text).toContain("The credit card on file is scheduled to expire in the next couple of days, and we haven't received an updated payment method yet.");
    expect(m.text).toContain("If we do not receive the updated information by November 30, 2026, your membership access will be paused until billing information is updated.");
    expect(m.text).toContain("If you'd like to continue your membership, please take a minute to update your card.");
  });

  it("uses Julia's declined wording, also through failedPaymentNotice", () => {
    const m = failedPaymentNotice({ firstName: "Alex", paymentLink: "L" });
    expect(m.text).toContain("We attempted to process your membership payment, but the transaction was declined.");
    expect(m.text).toContain("This can happen for a variety of reasons, such as an expired card, insufficient funds, or outdated billing information.");
    expect(m.text).toContain("To keep your membership active and avoid any interruption in access, please update your payment method at your earliest convenience.");
    expect(m.text).toContain("Thank you,\nThe Private Floor Club Team");
  });

  it("has every email in EN, ES, DE and JA, with the date in the member's language and no banned words", () => {
    for (const locale of BILLING_EMAIL_LOCALES) {
      const mails = [
        cardExpiringEmail("30", { locale, name: "Ana", expiresOn: cardExpiryDay(12, 2026), link: "L" }),
        cardExpiringEmail("2", { locale, name: "Ana", expiresOn: cardExpiryDay(12, 2026), link: "L" }),
        paymentDeclinedEmail({ locale, name: "Ana", link: "L" }),
      ];
      for (const m of mails) {
        expect(m.text).toContain("Ana");
        expect(m.text).toContain("L");
        expect(m.text).not.toContain("{date}");
        expect(BANNED.test(m.subject + m.text)).toBe(false);
      }
      expect(mails[0].text).toContain(formatExpiry(cardExpiryDay(12, 2026), locale));
    }
    expect(cardExpiringEmail("30", { locale: "es", name: "A", expiresOn: cardExpiryDay(12, 2026), link: "" }).text).toContain("31 de diciembre de 2026");
    expect(cardExpiringEmail("30", { locale: "de", name: "A", expiresOn: cardExpiryDay(12, 2026), link: "" }).text).toContain("31. Dezember 2026");
    expect(cardExpiringEmail("30", { locale: "ja", name: "A", expiresOn: cardExpiryDay(12, 2026), link: "" }).text).toContain("2026年12月31日");
  });

  it("sends 30 days out, then 2 days out, once each, and nothing after expiry", () => {
    const end = cardExpiresAt(12, 2026).getTime();
    const day = 86400000;
    const none = new Set<"30" | "2">();
    expect(cardNoticeDue({ expMonth: 12, expYear: 2026, now: new Date(end - 31 * day), sent: none })).toBeNull();
    expect(cardNoticeDue({ expMonth: 12, expYear: 2026, now: new Date(end - 29 * day), sent: none })).toBe("30");
    expect(cardNoticeDue({ expMonth: 12, expYear: 2026, now: new Date(end - 29 * day), sent: new Set(["30"]) })).toBeNull();
    expect(cardNoticeDue({ expMonth: 12, expYear: 2026, now: new Date(end - 1.5 * day), sent: new Set(["30"]) })).toBe("2");
    expect(cardNoticeDue({ expMonth: 12, expYear: 2026, now: new Date(end - 1.5 * day), sent: none })).toBe("2");
    expect(cardNoticeDue({ expMonth: 12, expYear: 2026, now: new Date(end - 1.5 * day), sent: new Set(["2"]) })).toBeNull();
    expect(cardNoticeDue({ expMonth: 12, expYear: 2026, now: new Date(end + 1000), sent: none })).toBeNull();
    expect(cardNoticeDue({ expMonth: 0, expYear: 0, now: new Date(), sent: none })).toBeNull();
    expect(expiryKey(3, 2027)).toBe("2027-03");
  });

  it("runs the sweep from the member layout, through the Outbox, and keeps the declined template key", () => {
    const layout = readFileSync(path.join(ROOT, "app/(app)/layout.tsx"), "utf8");
    expect(layout).toContain("cardExpirySweep");
    const db = readFileSync(path.join(ROOT, "lib/billing-db.ts"), "utf8");
    const sweep = db.slice(db.indexOf("export async function cardExpirySweep"));
    expect(sweep).toContain("sendNotice(");
    expect(sweep).toContain("cardExpiryNotice.create");
    const record = readFileSync(path.join(ROOT, "lib/payment-record.ts"), "utf8");
    expect(record).toContain('templateKey: "payment_failed"');
  });

  it("provides admin-only billing previews", () => {
    const preview = readFileSync(path.join(ROOT, "app/(app)/admin/templates/billing/page.tsx"), "utf8");
    expect(preview).toContain("await requireAdmin()");
    expect(preview).toContain("cardExpiringEmail(");
    expect(preview).toContain("paymentDeclinedEmail(");
    expect(preview).toContain('data-testid="billing-email-previews"');
  });

  it("handles summer expiry and invalid card months", () => {
    expect(cardExpiresAt(6, 2027).toISOString()).toBe("2027-07-01T04:00:00.000Z");
    for (const expMonth of [-1, 13, 1.5, NaN]) {
      expect(cardNoticeDue({ expMonth, expYear: 2027, now: new Date(), sent: new Set() })).toBeNull();
    }
  });

  it("adds the CardExpiryNotice table with an add-only migration", () => {
    const dir = path.join(__dirname, "..", "prisma", "migrations");
    const m = readdirSync(dir).find((d) => d.endsWith("_card_expiry_notices"));
    expect(m).toBeTruthy();
    const sql = readFileSync(path.join(dir, m!, "migration.sql"), "utf8").replace(/--.*$/gm, "");
    expect(sql).not.toMatch(/\bDROP\b|\bRENAME\b|\bDELETE\b|\bTRUNCATE\b|\bUPDATE\b/i);
  });
});
