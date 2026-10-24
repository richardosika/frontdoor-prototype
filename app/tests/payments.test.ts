import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { applicationStatusLabel, matchesApplicationFilter } from "@/lib/application-status";
import { annualDuesCents } from "@/lib/dues";
import {
  blocksMembership,
  checkoutIsPaid,
  checkoutMode,
  checkoutModeForRole,
  paymentRequired,
  paymentStatusLabel,
  renewalReminderDue,
  stripePriceForRole,
  verifyStripeSignature,
} from "@/lib/payments";

const DAY = 24 * 60 * 60 * 1000;

describe("annual dues", () => {
  it("charges the flat role amounts and never a deal fee", () => {
    expect(annualDuesCents("GENERAL_CONTRACTOR")).toBe(240_000);
    expect(annualDuesCents("BROKER")).toBe(180_000);
    expect(annualDuesCents("MORTGAGE_BROKER")).toBe(180_000);
    expect(annualDuesCents("RE_ATTORNEY")).toBe(120_000);
    expect(annualDuesCents("ARCHITECT_ENGINEER")).toBe(120_000);
    expect(annualDuesCents("DEVELOPER")).toBe(0);
    expect(annualDuesCents("INVESTOR_PE")).toBe(0);
    expect(annualDuesCents("FAMILY_OFFICE")).toBe(0);
    expect(annualDuesCents("LENDER")).toBe(0);
    expect(paymentRequired("GENERAL_CONTRACTOR")).toBe(true);
    expect(paymentRequired("DEVELOPER")).toBe(false);
  });

  it("labels payment states and blocks the floor only while money is outstanding", () => {
    expect(paymentStatusLabel("DUE")).toBe("Payment due");
    expect(paymentStatusLabel("PAID")).toBe("Paid");
    expect(paymentStatusLabel("WAIVED")).toBe("Waived");
    expect(blocksMembership("DUE")).toBe(true);
    expect(blocksMembership("FAILED")).toBe(true);
    expect(blocksMembership("REFUNDED")).toBe(true);
    expect(blocksMembership("PAID")).toBe(false);
    expect(blocksMembership("WAIVED")).toBe(false);
    expect(blocksMembership("NOT_REQUIRED")).toBe(false);
  });

  it("keeps approved-but-unpaid applications on the approved filter", () => {
    expect(applicationStatusLabel("PAYMENT_DUE")).toBe("Approved, payment due");
    expect(matchesApplicationFilter("approved", "PAYMENT_DUE", null)).toBe(true);
    expect(matchesApplicationFilter("approved", "APPROVED", null)).toBe(true);
    expect(matchesApplicationFilter("action", "PAYMENT_DUE", null)).toBe(false);
    expect(matchesApplicationFilter("declined", "PAYMENT_DUE", null)).toBe(false);
  });
});

describe("checkout mode", () => {
  it("stays simulated unless the test secret, webhook secret, and role price are all set", () => {
    expect(checkoutMode({ secretKey: "sk_test", webhookSecret: "whsec", priceId: "price_gc" })).toBe("stripe");
    expect(checkoutMode({ secretKey: "", webhookSecret: "whsec", priceId: "price_gc" })).toBe("simulated");
    expect(checkoutMode({ secretKey: "sk_test", webhookSecret: "", priceId: "price_gc" })).toBe("simulated");
    expect(checkoutMode({ secretKey: "sk_test", webhookSecret: "whsec", priceId: "" })).toBe("simulated");
    const env = {
      STRIPE_SECRET_KEY: "sk_test",
      STRIPE_WEBHOOK_SECRET: "whsec",
      STRIPE_PRICE_GC: "price_gc",
      STRIPE_PRICE_BROKER: "price_broker",
      STRIPE_PRICE_ADVISOR: "price_advisor",
    } as unknown as NodeJS.ProcessEnv;
    expect(stripePriceForRole("GENERAL_CONTRACTOR", env)).toBe("price_gc");
    expect(stripePriceForRole("BROKER", env)).toBe("price_broker");
    expect(stripePriceForRole("RE_ATTORNEY", env)).toBe("price_advisor");
    expect(stripePriceForRole("DEVELOPER", env)).toBe("");
    expect(checkoutModeForRole("GENERAL_CONTRACTOR", env)).toBe("stripe");
    expect(checkoutModeForRole("DEVELOPER", env)).toBe("simulated");
    expect(checkoutModeForRole("GENERAL_CONTRACTOR", {} as unknown as NodeJS.ProcessEnv)).toBe("simulated");
  });

  it("treats a complete subscription checkout as paid", () => {
    expect(checkoutIsPaid({ mode: "subscription", status: "complete" })).toBe(true);
    expect(checkoutIsPaid({ mode: "payment", status: "complete", payment_status: "paid" })).toBe(true);
    expect(checkoutIsPaid({ mode: "payment", status: "complete", payment_status: "unpaid" })).toBe(false);
    expect(checkoutIsPaid({ mode: "subscription", status: "open" })).toBe(false);
  });
});

describe("stripe signature", () => {
  const secret = "whsec_test";
  const payload = '{"id":"evt_1"}';

  function header(timestamp: number, body = payload, key = secret) {
    const signature = createHmac("sha256", key).update(`${timestamp}.${body}`).digest("hex");
    return `t=${timestamp},v1=${signature}`;
  }

  it("accepts a fresh matching signature and rejects a bad or stale one", () => {
    const now = Date.now();
    const stamp = Math.floor(now / 1000);
    expect(verifyStripeSignature(payload, header(stamp), secret, now)).toBe(true);
    expect(verifyStripeSignature(payload, header(stamp).replace(/v1=.*/, "v1=deadbeef"), secret, now)).toBe(false);
    expect(verifyStripeSignature(payload, header(stamp - 301), secret, now)).toBe(false);
    expect(verifyStripeSignature(payload, null, secret, now)).toBe(false);
    expect(verifyStripeSignature(payload, header(stamp), "", now)).toBe(false);
  });
});

describe("renewal reminders", () => {
  const now = new Date("2026-10-24T12:00:00Z");

  it("is due inside 30 days and at most weekly", () => {
    const renewalAt = new Date(now.getTime() + 10 * DAY);
    expect(renewalReminderDue({ renewalAt: null, lastSentAt: null, now })).toBe(false);
    expect(renewalReminderDue({ renewalAt, lastSentAt: null, now })).toBe(true);
    expect(renewalReminderDue({ renewalAt, lastSentAt: new Date(now.getTime() - DAY), now })).toBe(false);
    expect(renewalReminderDue({ renewalAt, lastSentAt: new Date(now.getTime() - 8 * DAY), now })).toBe(true);
    expect(renewalReminderDue({ renewalAt: new Date(now.getTime() + 40 * DAY), lastSentAt: null, now })).toBe(false);
    expect(renewalReminderDue({ renewalAt: new Date(now.getTime() - DAY), lastSentAt: null, now })).toBe(false);
  });
});
