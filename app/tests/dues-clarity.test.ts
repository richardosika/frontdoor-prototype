import { describe, expect, it } from "vitest";
import { BEFORE_SUBMIT_INTRO, CONSENT_LEGAL_LINKS, CONSENT_SECTIONS } from "@/lib/apply-consent";
import { DUES_ANNUAL_NOTE, DUES_SCHEDULE_SENTENCE, DUES_TABLE, duesLabel } from "@/lib/dues";
import { replacementTemplateBody, templateDef } from "@/lib/email-templates";
import { clarifyAnnualDues } from "@/lib/help/store";
import { paymentRenewalLabel, renewalInOneYear } from "@/lib/payments";
import { formatEtDate } from "@/lib/format";
import { withRenewalLine } from "@/lib/mail";

describe("annual dues wording", () => {
  it("states the flat annual schedule", () => {
    expect(DUES_TABLE.map((row) => row.amount)).toEqual(["$2,400 per year", "$1,800 per year", "$1,200 per year", "Free"]);
    expect(DUES_SCHEDULE_SENTENCE).toContain("General contractors: $2,400 per year");
    expect(DUES_SCHEDULE_SENTENCE).toContain("Brokers: $1,800 per year");
    expect(DUES_SCHEDULE_SENTENCE).toContain("Attorneys and advisors: $1,200 per year");
    expect(DUES_SCHEDULE_SENTENCE).toContain(DUES_ANNUAL_NOTE);
    expect(duesLabel(240_000)).toBe("$2,400 per year");
    expect(duesLabel(0)).toBe("No annual dues");
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
    expect(paymentRenewalLabel(null, today)).toBe(`${formatEtDate(renewalInOneYear(today))} if recorded today`);
    expect(paymentRenewalLabel(renewalInOneYear(today), today)).toBe("2027-10-25");
    const previous = templateDef("payment_due");
    expect(previous?.body).toContain("Annual dues");
    expect(previous?.body).toContain("{renewal_date}");
    expect(replacementTemplateBody("payment_due", previous?.body || "")).toBeNull();
    const old = "Hello {first_name},\n\nYour Private Floor dues of {dues_amount} still need attention. No card number is stored. You can try again here: {payment_link}\n\nThe fee stays flat and is not tied to a deal.\n\nRichard Osika, Founder";
    expect(replacementTemplateBody("dues_reminder", old)).toContain("Renewal date: {renewal_date}");
    const letter = withRenewalLine("Pay here: https://example.com/pay\n\nRichard Osika, Founder", "payment_due", "2027-10-25 if recorded today");
    expect(letter).toContain("Annual dues are billed once a year.");
    expect(letter).toContain("Renewal date: 2027-10-25 if recorded today.");
    expect(letter.endsWith("Richard Osika, Founder")).toBe(true);
    expect(clarifyAnnualDues("General contractors pay $2,400 a year.")).toContain("$2,400 per year");
    expect(clarifyAnnualDues("General contractors pay $2,400 a year.")).toContain("billed once a year");
  });
});
