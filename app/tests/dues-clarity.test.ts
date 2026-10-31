import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BEFORE_SUBMIT_INTRO, CONSENT_LEGAL_LINKS, CONSENT_SECTIONS } from "@/lib/apply-consent";
import { DUES_BILLING_NOTE, DUES_LOCALES, DUES_SCHEDULE_SENTENCE, DUES_TABLE, PAID_MONTHLY_CENTS, duesLabel, firstMonthCents, monthlyDuesCents } from "@/lib/dues";
import { replacementTemplateBody, templateDef } from "@/lib/email-templates";
import { clarifyAnnualDues } from "@/lib/help/store";
import { paymentRenewalLabel, renewalInOneMonth } from "@/lib/payments";
import { withRenewalLine } from "@/lib/mail";

const LEGAL = path.resolve(__dirname, "../src/content/legal");

describe("monthly dues wording", () => {
  it("states the month-to-month schedule and the half-price first month", () => {
    expect(monthlyDuesCents("GENERAL_CONTRACTOR")).toBe(PAID_MONTHLY_CENTS);
    expect(monthlyDuesCents("BROKER")).toBe(PAID_MONTHLY_CENTS);
    expect(monthlyDuesCents("RE_ATTORNEY")).toBe(PAID_MONTHLY_CENTS);
    expect(monthlyDuesCents("DEVELOPER")).toBe(0);
    expect(firstMonthCents(PAID_MONTHLY_CENTS)).toBe(9_950);
    expect(DUES_TABLE[0].amount).toContain("$99.50");
    expect(DUES_TABLE[0].amount).toContain("$199 per month");
    expect(DUES_TABLE[1].amount).toContain("$99.50");
    expect(DUES_TABLE[1].amount).toContain("$199 per month");
    expect(DUES_TABLE[2].amount).toContain("$199 per month");
    expect(DUES_TABLE).toHaveLength(3);
    expect(DUES_TABLE.some((row) => /free|developer|lender|family office/i.test(`${row.role} ${row.amount}`))).toBe(false);
    expect(DUES_SCHEDULE_SENTENCE).toContain("General contractors:");
    expect(DUES_SCHEDULE_SENTENCE).toContain(DUES_BILLING_NOTE);
    expect(DUES_SCHEDULE_SENTENCE).not.toMatch(/founding|per year|once a year/i);
    expect(DUES_BILLING_NOTE).not.toMatch(/deal/i);
    expect(DUES_SCHEDULE_SENTENCE).not.toMatch(/based on a deal|never based on|flat, never/i);
    expect(duesLabel(PAID_MONTHLY_CENTS)).toBe("$199 per month");
    expect(duesLabel(0)).toBe("");
    expect(DUES_SCHEDULE_SENTENCE).not.toMatch(/free for developers|no monthly dues|no dues/i);
    expect(DUES_LOCALES.map((row) => row.id)).toEqual(["en", "es", "de", "ja"]);
    for (const row of DUES_LOCALES) {
      expect(row.text).toContain("$199");
      expect(row.text).toContain("$99.50");
      expect(row.text).not.toContain("$149");
      expect(row.text).not.toContain("$129");
      expect(row.text).not.toMatch(/gratis para|kostenlos für|は無料|free for developers/i);
      expect(row.text.toLowerCase()).not.toContain("founding");
    }
  });

  it("keeps free-role cost wording off the named legal pages", () => {
    for (const file of ["terms.md", "disclosures.md", "applicant-consent.md"]) {
      const text = readFileSync(path.join(LEGAL, file), "utf8");
      expect(text).toContain("$199");
      expect(text).toContain("$99.50");
      expect(text).not.toContain("Membership is free for developers");
      expect(text).not.toContain("Free memberships");
      expect(text).not.toContain("$149");
      expect(text).not.toContain("$129");
    }
  });

  it("keeps the consent points and shows dues as a table", () => {
    expect(BEFORE_SUBMIT_INTRO).toContain("vetted network");
    expect(CONSENT_SECTIONS.map((section) => section.label)).toEqual([
      "How we review",
      "A person decides",
      "What you'll see",
      "Not a consumer report",
      "Optional items",
      "Privacy",
      "Dues",
      "Electronic records",
      "Language",
    ]);
    const review = CONSENT_SECTIONS.find((section) => section.id === "review");
    expect(review?.body).toContain("OFAC");
    expect(review?.body).toContain("duplicate or fraudulent");
    expect(CONSENT_SECTIONS.find((section) => section.id === "person")?.body).toContain("No decision is made by automated means alone");
    expect(CONSENT_SECTIONS.find((section) => section.id === "status")?.body).toContain("Verification Review");
    expect(CONSENT_SECTIONS.find((section) => section.id === "report")?.body).toContain("not a consumer reporting agency");
    expect(CONSENT_SECTIONS.find((section) => section.id === "dues")?.dues).toBe(true);
    expect(CONSENT_LEGAL_LINKS.map(([, label]) => label)).toEqual([
      "Terms",
      "Privacy",
      "Disclosures",
      "Verification Policy",
      "Applicant consent",
      "Guidelines",
    ]);
  });

  it("names the renewal date on a payment letter", () => {
    const today = new Date("2026-10-25T16:00:00.000Z");
    expect(paymentRenewalLabel(null, today)).toBe("November 25, 2026");
    expect(paymentRenewalLabel(renewalInOneMonth(today), today)).toBe("November 25, 2026");
    const previous = templateDef("payment_due");
    expect(previous?.body).toContain("month to month");
    expect(previous?.body).toContain("{intro_amount}");
    expect(previous?.body).toContain("Your first full-price payment would be on {renewal_date}.");
    expect(replacementTemplateBody("payment_due", previous?.body || "")).toBeNull();
    const old = "Hello {first_name},\n\nYour Private Floor dues of {dues_amount} still need attention. No card number is stored. You can try again here: {payment_link}\n\nThe fee stays flat and is not tied to a deal.\n\nRichard Osika, Founder";
    expect(replacementTemplateBody("dues_reminder", old)).toContain("{intro_amount}");
    const letter = withRenewalLine("Pay here: https://example.com/pay\n\nRichard Osika, Founder", "payment_due", "2026-11-25 if recorded today");
    expect(letter).toContain("Membership is month to month.");
    expect(letter).toContain("Next charge date: 2026-11-25 if recorded today.");
    expect(letter.endsWith("Richard Osika, Founder")).toBe(true);
    expect(clarifyAnnualDues("General contractors pay $2,400 a year.")).toContain("$199 per month");
    expect(clarifyAnnualDues("General contractors pay $2,400 a year.")).toContain("first month $99.50");
    expect(clarifyAnnualDues("Brokers pay $129 per month, first month $64.50.")).toContain("$199 per month");
    expect(clarifyAnnualDues("Brokers pay $129 per month, first month $64.50.")).toContain("$99.50");
  });
});
