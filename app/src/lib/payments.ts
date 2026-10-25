import { createHmac, timingSafeEqual } from "node:crypto";
import { annualDuesCents } from "@/lib/dues";
import { formatEtDate } from "@/lib/format";

export type DuesGroup = "free" | "gc" | "broker" | "advisor";

export function duesGroup(role: string): DuesGroup {
  if (annualDuesCents(role) === 0) return "free";
  if (role === "GENERAL_CONTRACTOR") return "gc";
  if (role === "BROKER" || role === "MORTGAGE_BROKER") return "broker";
  return "advisor";
}

export function paymentRequired(role: string): boolean {
  return duesGroup(role) !== "free";
}

export function blocksMembership(status: string): boolean {
  return status === "DUE" || status === "FAILED" || status === "REFUNDED";
}

/** Payment states that may appear in the directory and receive introductions. */
export const LISTED_PAYMENT_STATUSES = ["NOT_REQUIRED", "PAID", "WAIVED"] as const;

export function eligibleForDirectory(member: { status: string; paymentStatus: string }): boolean {
  return member.status === "ACTIVE" && (LISTED_PAYMENT_STATUSES as readonly string[]).includes(member.paymentStatus);
}

export function paymentStatusLabel(status: string): string {
  if (status === "NOT_REQUIRED") return "No dues";
  if (status === "DUE") return "Payment due";
  if (status === "PAID") return "Paid";
  if (status === "WAIVED") return "Waived";
  if (status === "FAILED") return "Payment failed";
  if (status === "REFUNDED") return "Refund noted";
  return status;
}

export type CheckoutEnv = {
  secretKey?: string | null;
  webhookSecret?: string | null;
  priceId?: string | null;
};

/** Stripe is used only when the test secret, webhook secret, and a price for the role are all set. */
export function checkoutMode(env: CheckoutEnv): "stripe" | "simulated" {
  if (env.secretKey && env.webhookSecret && env.priceId) return "stripe";
  return "simulated";
}

export function stripePriceForRole(role: string, env: NodeJS.ProcessEnv = process.env): string {
  const group = duesGroup(role);
  if (group === "gc") return env.STRIPE_PRICE_GC || "";
  if (group === "broker") return env.STRIPE_PRICE_BROKER || "";
  if (group === "advisor") return env.STRIPE_PRICE_ADVISOR || "";
  return "";
}

export function checkoutModeForRole(role: string, env: NodeJS.ProcessEnv = process.env): "stripe" | "simulated" {
  return checkoutMode({
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    priceId: stripePriceForRole(role, env),
  });
}

/** One year after the America/New_York calendar date, stored so that same date still displays in New York. */
export function renewalInOneYear(from = new Date()): Date {
  const [year, month, day] = formatEtDate(from).split("-").map(Number);
  return new Date(Date.UTC(year + 1, month - 1, day, 16, 0, 0));
}

/** True in the 30 days before renewal, and not more often than weekly. */
export function renewalReminderDue(input: { renewalAt: Date | null; lastSentAt: Date | null; now?: Date }): boolean {
  if (!input.renewalAt) return false;
  const now = input.now ?? new Date();
  const days = (input.renewalAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (days < 0 || days > 30) return false;
  if (!input.lastSentAt) return true;
  return now.getTime() - input.lastSentAt.getTime() > 7 * 24 * 60 * 60 * 1000;
}

export function checkoutIsPaid(session: { mode?: string; status?: string; payment_status?: string }): boolean {
  if (session.status !== "complete") return false;
  if (session.mode === "subscription") return true;
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

/** Stripe's `t=timestamp,v1=hex` header over `${timestamp}.${rawBody}`. */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now()): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  const stamp = Number(timestamp);
  if (!Number.isFinite(stamp)) return false;
  if (Math.abs(now - stamp * 1000) > SIGNATURE_TOLERANCE_MS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuf = Buffer.from(expected);
  return signatures.some((signature) => {
    const actual = Buffer.from(signature);
    return actual.length === expectedBuf.length && timingSafeEqual(actual, expectedBuf);
  });
}

export const DUES_COVERS =
  "One year of access to the Private Floor Club. Annual dues are a flat fee, billed once a year, and due only after approval. The amount does not change because a deal happens, and Private Floor does not charge a success fee or hold member funds.";

/** Date shown on the payment page and in the payment-link email. */
export function paymentRenewalLabel(renewalAt: Date | null, now = new Date()): string {
  const date = formatEtDate(renewalAt ?? renewalInOneYear(now));
  return renewalAt ? date : `${date} if recorded today`;
}
