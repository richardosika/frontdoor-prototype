import { describe, expect, it } from "vitest";
import { BEFORE_SUBMIT_INTRO, CONSENT_LEGAL_LINKS, CONSENT_SECTIONS } from "@/lib/apply-consent";
import { DUES_BILLING_NOTE, DUES_LOCALES, DUES_SCHEDULE_SENTENCE, DUES_TABLE, duesLabel, firstMonthCents, monthlyDuesCents } from "@/lib/dues";
import { replacementTemplateBody, templateDef } from "@/lib/email-templates";
import { clarifyAnnualDues } from "@/lib/help/store";
import { paymentRenewalLabel, renewalInOneMonth } from "@/lib/payments";
import { formatEtDate } from "@/lib/format";
import { withRenewalLine } from "@/lib/mail";

describe("monthly dues wording", () => {
  it("states the month-to-month schedule and the half-price first month", () => {
    expect(monthlyDuesCents("GENERAL_CONTRACTOR")).toBe(14_900);
    expect(firstMonthCents(14_900)).toBe(7_450);
    expect(firstMonthCents(12_900)).toBe(6_450);
    expect(DUES_TABLE[0].amount).toContain("$74.50");
    expect(DUES_TABLE[0].amount).toContain("$149 per month");
    expect(DUES_TABLE[1].amount).toContain("$64.50");
    expect(DUES_TABLE[1].amount).toContain("$129 per month");
    expect(DUES_TABLE[3].amount).toBe("Free");
    expect(DUES_SCHEDULE_SENTENCE).toContain("General contractors:");
    expect(DUES_SCHEDULE_SENTENCE).toContain(DUES_BILLING_NOTE);
    expect(DUES_SCHEDULE_SENTENCE).not.toMatch(/founding|per year|once a year/i);
    expect(duesLabel(14_900)).toBe("$149 per month");
    expect(duesLabel(0)).toBe("No monthly dues");
    expect(DUES_LOCALES.map((row) => row.id)).toEqual(["en", "es", "de", "ja"]);
    for (const row of DUES_LOCALES) {
      expect(row.text).toContain("$149");
      expect(row.text).toContain("$74.50");
      expect(row.text).toContain("$129");
      expect(row.text).toContain("$64.50");
      expect(row.text.toLowerCase()).not.toContain("founding");
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
    expect(paymentRenewalLabel(null, today)).toBe(`${formatEtDate(renewalInOneMonth(today))} if recorded today`);
    expect(paymentRenewalLabel(renewalInOneMonth(today), today)).toBe("2026-11-25");
    const previous = templateDef("payment_due");
    expect(previous?.body).toContain("month to month");
    expect(previous?.body).toContain("{intro_amount}");
    expect(previous?.body).toContain("{renewal_date}");
    expect(replacementTemplateBody("payment_due", previous?.body || "")).toBeNull();
    const old = "Hello {first_name},\n\nYour Private Floor dues of {dues_amount} still need attention. No card number is stored. You can try again here: {payment_link}\n\nThe fee stays flat and is not tied to a deal.\n\nRichard Osika, Founder";
    expect(replacementTemplateBody("dues_reminder", old)).toContain("{intro_amount}");
    const letter = withRenewalLine("Pay here: https://example.com/pay\n\nRichard Osika, Founder", "payment_due", "2026-11-25 if recorded today");
    expect(letter).toContain("Membership is month to month.");
    expect(letter).toContain("Next charge date: 2026-11-25 if recorded today.");
    expect(letter.endsWith("Richard Osika, Founder")).toBe(true);
    expect(clarifyAnnualDues("General contractors pay $2,400 a year.")).toContain("$149 per month");
    expect(clarifyAnnualDues("General contractors pay $2,400 a year.")).toContain("first month $74.50");
  });
});
