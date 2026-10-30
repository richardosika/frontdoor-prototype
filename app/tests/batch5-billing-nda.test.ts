import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resumeReminderEmail, addMonths, chargeOrder, fallbackMethod, isPaused, methodLabel, parsePauseMonths, pauseEnded, resumeReminderDue, showsBillingControls, stripePublishableTestKey } from "@/lib/billing";

import { PHRASES } from "@/lib/i18n/phrases";
import { documentVersion, legalDoc, readLegalMarkdown } from "@/lib/legal";
import { emptyProfile, pageTwoErrors } from "@/lib/join-form";
import { MEMBER_NDA_ERROR, MEMBER_NDA_LABEL, memberNdaVersion, needsMemberNda, safeNext } from "@/lib/member-nda";

const ROOT = path.join(__dirname, "..", "src");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
const BANNED = /\b(invite|invited|invite-only|founding member|limited)\b|invitad|einlad|招待|limitad|begrenzt/i;
const DAY = 86_400_000;

describe("membership dues page", () => {
  it("states one price line and the free roles, in all four languages", () => {
    const en = readLegalMarkdown("membership-dues.md");
    expect(en).toContain("Paid memberships are $199 per month; the first month is $99.50.");
    expect(en).toMatch(/free for developers, lenders, family offices, and investors\/LPs/);
    expect(en).not.toMatch(/General contractors: \$199|Brokers: \$199|Attorneys and advisors: \$199/);
    for (const locale of ["es", "de", "ja"]) {
      const text = readLegalMarkdown("membership-dues.md", locale);
      expect(text).toContain("$199");
      expect(text).toContain("$99.50");
      expect(documentVersion(text)).toBe(documentVersion(en));
      expect(text).not.toMatch(BANNED);
    }
  });
});

describe("billing controls", () => {
  it("only paid roles see them", () => {
    expect(showsBillingControls({ role: "DEVELOPER", paymentStatus: "NOT_REQUIRED" })).toBe(false);
    expect(showsBillingControls({ role: "LENDER", paymentStatus: "NOT_REQUIRED" })).toBe(false);
    expect(showsBillingControls({ role: "GENERAL_CONTRACTOR", paymentStatus: "PAID" })).toBe(true);
  });
  it("pauses 1 to 6 months, reminds a week before, then resumes", () => {
    expect([0, 7, 2.5, "x"].map(parsePauseMonths)).toEqual([null, null, null, null]);
    expect(parsePauseMonths("6")).toBe(6);
    const start = new Date(Date.UTC(2026, 0, 31, 16));
    expect(addMonths(start, 1).toISOString().slice(0, 10)).toBe("2026-02-28");
    const pausedUntil = new Date(Date.UTC(2026, 3, 1));
    const pausedAt = new Date(Date.UTC(2026, 0, 1));
    expect(resumeReminderDue({ pausedUntil, pausedAt, sentAt: null, now: new Date(pausedUntil.getTime() - 10 * DAY) })).toBe(false);
    expect(resumeReminderDue({ pausedUntil, pausedAt, sentAt: null, now: new Date(pausedUntil.getTime() - 6 * DAY) })).toBe(true);
    expect(resumeReminderDue({ pausedUntil, pausedAt, sentAt: new Date(pausedUntil.getTime() - 6 * DAY), now: new Date(pausedUntil.getTime() - 5 * DAY) })).toBe(false);
    expect(isPaused({ pausedUntil }, new Date(pausedUntil.getTime() - DAY))).toBe(true);
    expect(pauseEnded({ pausedUntil }, new Date(pausedUntil.getTime() + 1))).toBe(true);
    const mail = resumeReminderEmail("de", "Marcus", "1. April 2026");
    expect(mail.subject).toBe(PHRASES["Your Private Floor membership resumes next week"][1]);
    expect(mail.text).toContain("$199");
  });
  it("charges the primary card first and falls back to the backup", () => {
    const methods = [
      { role: "BACKUP" as const, stripePaymentMethodId: "pm_b" },
      { role: "PRIMARY" as const, stripePaymentMethodId: "pm_a" },
    ];
    expect(chargeOrder(methods).map((m) => m.role)).toEqual(["PRIMARY", "BACKUP"]);
    expect(fallbackMethod(methods, "pm_a")?.stripePaymentMethodId).toBe("pm_b");
    expect(fallbackMethod([methods[1]], "pm_a")).toBeNull();
    expect(methodLabel({ brand: "visa", last4: "4242", wallet: "apple_pay" })).toBe("Apple Pay · Visa •••• 4242");
  });
  it("uses Stripe only in test mode and never stores card numbers", () => {
    expect(stripePublishableTestKey({ STRIPE_PUBLISHABLE_KEY: "pk_live_x" } as unknown as NodeJS.ProcessEnv)).toBe("");
    expect(stripePublishableTestKey({ STRIPE_PUBLISHABLE_KEY: "pk_test_x" } as unknown as NodeJS.ProcessEnv)).toBe("pk_test_x");
    const schema = readFileSync(path.join(__dirname, "..", "prisma", "schema.prisma"), "utf8");
    const model = schema.slice(schema.indexOf("model PaymentMethod"), schema.indexOf("}", schema.indexOf("model PaymentMethod")));
    expect(model).not.toMatch(/cardNumber|number|cvc|pan\b/i);
    const settings = read("app/(app)/settings/page.tsx");
    expect(settings).toContain("showsBillingControls(user)");
    expect(settings).toContain("ConfirmSubmitButton");
    expect(read("components/card-setup.tsx")).toContain("PaymentElement");
    expect(read("components/card-setup.tsx")).toMatch(/applePay: "auto", googlePay: "auto"/);
    expect(read("app/api/stripe/webhook/route.ts")).toContain("fallbackMethod(");
  });
});

describe("data export moved to admin", () => {
  it("is gone from Settings and available on the admin member record", () => {
    expect(read("app/(app)/settings/page.tsx")).not.toContain("Export my data");
    expect(read("app/(app)/admin/members/[id]/page.tsx")).toContain("/api/admin/members/${member.id}/export");
    expect(read("app/api/admin/members/[id]/export/route.ts")).toContain("adminSignInAllowed(admin)");
  });
});

describe("membership card", () => {
  it("is deep green with a brass border, the PF mark, the name, Approved Member and Member since", () => {
    const card = read("components/membership-card.tsx");
    expect(card).toMatch(/border-brass/);
    expect(card).toContain("PF");
    const shell = read("components/shell.tsx");
    expect(shell.match(/<MembershipCard /g)?.length).toBe(2);
    expect(shell).toContain('"Approved Member"');
    expect(PHRASES["Approved Member"]).toHaveLength(3);
  });
});

describe("member NDA", () => {
  it("exists as a draft in four languages for Private Floor Club LLC", () => {
    expect(legalDoc("member-nda")).not.toBeNull();
    const en = readLegalMarkdown("member-nda.md");
    expect(en).toMatch(/New Jersey attorney/);
    expect(en).toContain("Private Floor Club LLC");
    for (const topic of [/deal information/, /documents/, /deal rooms/, /messages/, /member details/, /outside the platform/, /Non-circumvention/, /survive after you leave/]) expect(en).toMatch(topic);
    for (const locale of ["en", "es", "de", "ja"]) {
      const text = readLegalMarkdown("member-nda.md", locale);
      expect(text).toMatch(/^Version: /);
      expect(text).toMatch(/DRAFT/);
      expect(text).toContain("Private Floor Club LLC");
      expect(text).not.toMatch(BANNED);
    }
  });
  it("is required on /join next to the Member Terms with a link and no section numbers", () => {
    const profile = { ...emptyProfile(), acceptMemberNda: false };
    expect(pageTwoErrors(profile)).toContain(MEMBER_NDA_ERROR);
    expect(pageTwoErrors({ ...profile, acceptMemberNda: true })).not.toContain(MEMBER_NDA_ERROR);
    const join = read("components/join-application.tsx");
    expect(join).toContain("Read the Member NDA");
    expect(join).toContain("MEMBER_NDA_HREF");
    expect(MEMBER_NDA_LABEL).not.toMatch(/section|§|\d/i);
    expect(read("actions/join.ts")).toContain("document: MEMBER_NDA_SLUG");
  });
  it("gates existing members until they accept the current version", () => {
    const version = memberNdaVersion();
    expect(needsMemberNda({ isAdmin: false, ndaVersion: "", ndaAcceptedAt: null }, version)).toBe(true);
    expect(needsMemberNda({ isAdmin: false, ndaVersion: "old", ndaAcceptedAt: new Date() }, version)).toBe(true);
    expect(needsMemberNda({ isAdmin: false, ndaVersion: version, ndaAcceptedAt: new Date() }, version)).toBe(false);
    expect(needsMemberNda({ isAdmin: true, ndaVersion: "", ndaAcceptedAt: null }, version)).toBe(false);
    expect(read("app/(app)/layout.tsx")).toMatch(/await enforceMemberNda\(user\)/);
    const action = read("actions/member-nda.ts");
    expect(action).toContain("ndaAcceptedAt: acceptedAt, ndaVersion: version");
    expect(safeNext("//evil.example")).toBe("/feed");
    expect(safeNext("/member-nda")).toBe("/feed");
    expect(safeNext("/deals/deal_jc")).toBe("/deals/deal_jc");
  });
});
