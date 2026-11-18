"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parsePauseMonths, showsBillingControls, stripePublishableTestKey } from "@/lib/billing";
import { pauseWindow } from "@/lib/billing-db";
import { requireAccount } from "@/lib/current-user";
import { isStripeTestSecret } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import {
  createSetupIntent,
  detachPaymentMethod,
  ensureStripeCustomer,
  retrieveSetupIntent,
  setDefaultPaymentMethod,
  setSubscriptionPause,
} from "@/lib/stripe-checkout";

type Role = "PRIMARY" | "BACKUP";

function go(key: "error" | "notice", text: string): never {
  redirect(`/settings?${key}=${encodeURIComponent(text)}#billing`);
}

async function billingUser() {
  const user = await requireAccount();
  if (!showsBillingControls(user)) go("error", "This membership has no monthly dues.");
  return user;
}

const secret = () => process.env.STRIPE_SECRET_KEY || "";

export async function pauseMembership(formData: FormData) {
  const user = await billingUser();
  const months = parsePauseMonths(formData.get("months"));
  if (!months) go("error", "Choose 1 to 6 months.");
  if (user.cancelRequestedAt) go("error", "Cancellation is already recorded.");
  const window = pauseWindow(new Date(), months, user.renewalAt);
  await prisma.user.update({ where: { id: user.id }, data: { ...window, pauseReminderSentAt: null } });
  if (isStripeTestSecret(secret()) && user.stripeSubscriptionId) await setSubscriptionPause(secret(), user.stripeSubscriptionId, window.pausedUntil);
  revalidatePath("/settings");
  go("notice", "Membership paused.");
}

export async function resumeMembershipNow() {
  const user = await billingUser();
  await prisma.user.update({ where: { id: user.id }, data: { pausedAt: null, pausedUntil: null, pauseReminderSentAt: null } });
  if (isStripeTestSecret(secret()) && user.stripeSubscriptionId) await setSubscriptionPause(secret(), user.stripeSubscriptionId, null);
  revalidatePath("/settings");
  go("notice", "Membership resumed.");
}

/** Starts the Stripe Payment Element (cards, Apple Pay, Google Pay). Returns a client secret; never a card number. */
export async function startCardSetup(role: Role): Promise<{ ok: true; clientSecret: string; publishableKey: string } | { ok: false; error: string }> {
  const user = await requireAccount();
  if (!showsBillingControls(user)) return { ok: false, error: "This membership has no monthly dues." };
  const key = stripePublishableTestKey();
  if (!isStripeTestSecret(secret()) || !key) return { ok: false, error: "Stripe test keys are not configured." };
  const customer = await ensureStripeCustomer(secret(), { customerId: user.stripeCustomerId, email: user.email, name: user.name, userId: user.id });
  if (!customer.ok) return customer;
  if (customer.value !== user.stripeCustomerId) await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.value } });
  const intent = await createSetupIntent(secret(), customer.value, user.id);
  if (!intent.ok) return intent;
  void role;
  return { ok: true, clientSecret: intent.value.clientSecret, publishableKey: key };
}

/** After the Payment Element confirms, read brand/last4 back from Stripe and store only those. */
export async function finishCardSetup(setupIntentId: string, role: Role): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAccount();
  if (!showsBillingControls(user) || !isStripeTestSecret(secret())) return { ok: false, error: "Stripe test keys are not configured." };
  const intent = await retrieveSetupIntent(secret(), setupIntentId);
  if (!intent.ok) return { ok: false, error: intent.error };
  const meta = intent.value.metadata as { userId?: string } | undefined;
  if (meta?.userId !== user.id || intent.value.status !== "succeeded") return { ok: false, error: "Stripe did not confirm that card." };
  const method = intent.value.payment_method as { id: string; card?: { brand?: string; last4?: string; exp_month?: number; exp_year?: number; wallet?: { type?: string } | null } };
  const old = await prisma.paymentMethod.findUnique({ where: { userId_role: { userId: user.id, role } } });
  await prisma.paymentMethod.upsert({
    where: { userId_role: { userId: user.id, role } },
    update: { stripePaymentMethodId: method.id, brand: method.card?.brand || "", last4: method.card?.last4 || "", expMonth: method.card?.exp_month || 0, expYear: method.card?.exp_year || 0, wallet: method.card?.wallet?.type || "", mode: "stripe" },
    create: { userId: user.id, role, stripePaymentMethodId: method.id, brand: method.card?.brand || "", last4: method.card?.last4 || "", expMonth: method.card?.exp_month || 0, expYear: method.card?.exp_year || 0, wallet: method.card?.wallet?.type || "", mode: "stripe" },
  });
  if (role === "PRIMARY") await setDefaultPaymentMethod(secret(), user.stripeCustomerId, method.id, user.stripeSubscriptionId);
  if (old?.stripePaymentMethodId && old.stripePaymentMethodId !== method.id) await detachPaymentMethod(secret(), old.stripePaymentMethodId);
  revalidatePath("/settings");
  return { ok: true };
}

/** Test-only stand-in when Stripe test keys are not set: records a TEST card label. No card number is entered or stored. */
export async function addSimulatedCard(formData: FormData) {
  const user = await billingUser();
  if (isStripeTestSecret(secret()) && stripePublishableTestKey()) go("error", "Use the Stripe form to add a card.");
  const role: Role = formData.get("role") === "BACKUP" ? "BACKUP" : "PRIMARY";
  const wallet = String(formData.get("wallet") || "");
  const sample = role === "PRIMARY" ? { brand: "visa", last4: "4242" } : { brand: "mastercard", last4: "4444" };
  const data = { ...sample, expMonth: 12, expYear: 2030, wallet: wallet === "apple_pay" || wallet === "google_pay" ? wallet : "", mode: "simulated", stripePaymentMethodId: "" };
  await prisma.paymentMethod.upsert({ where: { userId_role: { userId: user.id, role } }, update: data, create: { userId: user.id, role, ...data } });
  revalidatePath("/settings");
  go("notice", role === "PRIMARY" ? "Primary card saved." : "Backup card saved.");
}

export async function swapPaymentMethods() {
  const user = await billingUser();
  const methods = await prisma.paymentMethod.findMany({ where: { userId: user.id } });
  const primary = methods.find((m) => m.role === "PRIMARY");
  const backup = methods.find((m) => m.role === "BACKUP");
  if (!primary || !backup) go("error", "Add a backup card first.");
  // Swap through a temporary delete/recreate so the unique (userId, role) pair never collides.
  await prisma.$transaction([
    prisma.paymentMethod.deleteMany({ where: { userId: user.id } }),
    prisma.paymentMethod.create({ data: { ...strip(backup), role: "PRIMARY" } }),
    prisma.paymentMethod.create({ data: { ...strip(primary), role: "BACKUP" } }),
  ]);
  if (isStripeTestSecret(secret()) && backup.stripePaymentMethodId && user.stripeCustomerId) {
    await setDefaultPaymentMethod(secret(), user.stripeCustomerId, backup.stripePaymentMethodId, user.stripeSubscriptionId);
  }
  revalidatePath("/settings");
  go("notice", "Backup card is now the primary card.");
}

function strip(method: { userId: string; stripePaymentMethodId: string; brand: string; last4: string; expMonth: number; expYear: number; wallet: string; mode: string }) {
  const { userId, stripePaymentMethodId, brand, last4, expMonth, expYear, wallet, mode } = method;
  return { userId, stripePaymentMethodId, brand, last4, expMonth, expYear, wallet, mode };
}

export async function removeBackupCard() {
  const user = await billingUser();
  const backup = await prisma.paymentMethod.findUnique({ where: { userId_role: { userId: user.id, role: "BACKUP" } } });
  if (!backup) go("error", "No backup card is saved.");
  await prisma.paymentMethod.delete({ where: { id: backup.id } });
  if (isStripeTestSecret(secret()) && backup.stripePaymentMethodId) await detachPaymentMethod(secret(), backup.stripePaymentMethodId);
  revalidatePath("/settings");
  go("notice", "Backup card removed.");
}
