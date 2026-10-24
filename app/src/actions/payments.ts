"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser, requireAccount, requireAdmin } from "@/lib/current-user";
import { annualDuesCents, duesLabel } from "@/lib/dues";
import { activatePaidMembership, markPaymentFailed, sendRenewalReminder } from "@/lib/payment-record";
import { blocksMembership, checkoutModeForRole, paymentRequired, renewalInOneYear, stripePriceForRole } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { createBillingPortal, createDuesCheckout, retrieveCheckoutSession, sessionPaid, sessionUserId } from "@/lib/stripe-checkout";
import { sendNotice } from "@/lib/notices";
import { appBaseUrl } from "@/lib/url";

async function payerByToken(token: string) {
  if (!token) return null;
  return prisma.user.findUnique({ where: { paymentToken: token } });
}

function adminReturn(formData: FormData, fallback: string) {
  const back = String(formData.get("back") || "");
  if (back.startsWith("/admin/") && !back.includes("://") && !back.includes("\\") && !back.includes("..")) return back;
  return fallback;
}

function withQuery(path: string, key: string, value: string) {
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}${key}=${encodeURIComponent(value)}`;
}

export async function simulatePayment(formData: FormData) {
  const token = String(formData.get("token") || "");
  const account = token ? await payerByToken(token) : await requireAccount();
  if (!account || account.status !== "ACTIVE") redirect("/login");
  if (checkoutModeForRole(account.role) === "stripe") redirect(`/pay/${account.paymentToken || ""}?error=Use+Stripe+test+checkout`);
  if (!blocksMembership(account.paymentStatus) && account.paymentStatus !== "NOT_REQUIRED") {
    redirect("/feed");
  }
  if (!paymentRequired(account.role) && account.paymentStatus === "NOT_REQUIRED") redirect("/feed");
  await activatePaidMembership({
    userId: account.id,
    mode: "simulated",
    renewalAt: renewalInOneYear(),
    welcome: true,
  });
  revalidatePath("/pay");
  revalidatePath("/feed");
  revalidatePath("/admin");
  const viewer = await currentUser();
  if (viewer?.id === account.id) redirect("/feed?notice=Test+payment+recorded.+No+card+was+charged");
  redirect(`/pay/${token}?notice=Test+payment+recorded.+Sign+in+to+open+the+floor`);
}

export async function simulateFailedPayment(formData: FormData) {
  const token = String(formData.get("token") || "");
  const account = token ? await payerByToken(token) : await requireAccount();
  if (!account) redirect("/login");
  if (checkoutModeForRole(account.role) === "stripe") redirect("/pay?error=Stripe+reports+failed+payments+by+webhook");
  await markPaymentFailed(account.id);
  revalidatePath("/pay");
  redirect(token ? `/pay/${token}?notice=Test+failure+recorded` : "/pay?notice=Test+failure+recorded");
}

export async function startStripeCheckout(formData: FormData) {
  const token = String(formData.get("token") || "");
  const account = token ? await payerByToken(token) : await requireAccount();
  if (!account) redirect("/login");
  const secret = process.env.STRIPE_SECRET_KEY || "";
  const priceId = stripePriceForRole(account.role);
  if (checkoutModeForRole(account.role) !== "stripe") {
    redirect(`/pay/${account.paymentToken || ""}?error=Stripe+test+keys+are+not+set`);
  }
  const base = await appBaseUrl();
  const created = await createDuesCheckout({
    secret,
    priceId,
    userId: account.id,
    email: account.email,
    customerId: account.stripeCustomerId,
    successUrl: `${base}/pay?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}/pay/${account.paymentToken || ""}`,
  });
  if (!created.ok) redirect(`/pay/${account.paymentToken || ""}?error=${encodeURIComponent(created.error)}`);
  redirect(created.value.url);
}

export async function confirmStripeReturn(sessionId: string) {
  const secret = process.env.STRIPE_SECRET_KEY || "";
  if (!secret || !sessionId.startsWith("cs_")) return;
  const session = await retrieveCheckoutSession(secret, sessionId);
  if (!session.ok || !sessionPaid(session.value)) return;
  const userId = sessionUserId(session.value);
  if (!userId) return;
  const { claimPaymentEvent } = await import("@/lib/payment-record");
  const claimed = await claimPaymentEvent(sessionId, userId, "checkout.session.completed");
  if (!claimed) return;
  const customer = String(session.value.customer || "");
  const subscription = String(session.value.subscription || "");
  await activatePaidMembership({
    userId,
    mode: "stripe",
    stripeCustomerId: customer,
    stripeSubscriptionId: subscription,
    welcome: true,
  });
}

export async function resendPaymentLink(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member) redirect("/admin/applications");
  const token = member.paymentToken || randomBytes(24).toString("hex");
  if (!member.paymentToken) {
    await prisma.user.update({ where: { id: member.id }, data: { paymentToken: token } });
  }
  const base = await appBaseUrl();
  await sendNotice({
    intendedTo: member.email,
    subject: "Your Private Floor dues link",
    text: `Hello ${member.name},\n\nRichard Osika approved your application. Annual dues are ${duesLabel(member.duesCents || annualDuesCents(member.role))}. This is a flat membership fee, not a deal fee.\n\nPay here: ${base}/pay/${token}\n\nPrivate Floor does not store a card number. On this test the page is labelled TEST unless Stripe test keys are configured.\n`,
  });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "RESEND_PAYMENT_LINK",
      summary: `${admin.name} resent the dues link for ${member.name}.`,
    },
  });
  revalidatePath("/admin/outbox");
  redirect(withQuery(adminReturn(formData, "/admin/applications"), "notice", "Payment link resent to the Outbox"));
}

export async function markPaidManually(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member || member.isAdmin) redirect("/admin/applications?error=That+member+cannot+be+marked+paid");
  await activatePaidMembership({ userId: member.id, mode: "manual", renewalAt: renewalInOneYear(), welcome: true });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "MARK_PAID",
      summary: `${admin.name} marked ${member.name} paid. Amount ${duesLabel(member.duesCents || annualDuesCents(member.role))}. No card stored.`,
    },
  });
  revalidatePath("/admin");
  redirect(withQuery(adminReturn(formData, `/admin/members/${member.id}`), "notice", "Marked paid"));
}

export async function waiveDues(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const reason = String(formData.get("reason") || "").trim().slice(0, 500);
  if (reason.length < 3) redirect(withQuery(adminReturn(formData, `/admin/members/${userId}`), "error", "Write why dues are waived"));
  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member || member.isAdmin) redirect("/admin/members");
  await prisma.user.update({
    where: { id: member.id },
    data: { paymentStatus: "WAIVED", paymentMode: "waived", waiverReason: reason, renewalAt: null },
  });
  await prisma.application.updateMany({
    where: { userId: member.id },
    data: { status: "APPROVED", duesWaived: true },
  });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "WAIVE_DUES",
      summary: `${admin.name} waived dues for ${member.name}. ${reason}`,
    },
  });
  const base = await appBaseUrl();
  await sendNotice({
    intendedTo: member.email,
    subject: "Private Floor dues waived",
    text: `Hello ${member.name},\n\nA Private Floor administrator waived the annual dues. Your membership is active. Sign in at ${base}/login.\n`,
  });
  revalidatePath("/admin");
  redirect(withQuery(adminReturn(formData, `/admin/members/${member.id}`), "notice", "Dues waived"));
}

export async function recordRefund(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 500);
  if (note.length < 3) redirect(withQuery(adminReturn(formData, `/admin/members/${userId}`), "error", "Write the refund note"));
  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member || member.isAdmin) redirect("/admin/members");
  await prisma.user.update({
    where: { id: member.id },
    data: { paymentStatus: "REFUNDED", refundNote: note },
  });
  await prisma.application.updateMany({
    where: { userId: member.id, status: "APPROVED" },
    data: { status: "PAYMENT_DUE" },
  });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "REFUND_NOTE",
      summary: `${admin.name} recorded a refund note for ${member.name}. ${note}`,
    },
  });
  await sendNotice({
    intendedTo: member.email,
    subject: "Private Floor refund noted",
    text: `Hello ${member.name},\n\nA Private Floor administrator recorded a refund note. No card number is stored. The floor stays closed until dues are paid again.\n`,
  });
  revalidatePath("/admin");
  redirect(withQuery(adminReturn(formData, `/admin/members/${member.id}`), "notice", "Refund note saved"));
}

export async function sendRenewalReminderAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const sent = await sendRenewalReminder(userId);
  if (!sent) redirect(withQuery(adminReturn(formData, `/admin/members/${userId}`), "error", "Set a renewal date before sending a reminder"));
  const member = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "RENEWAL_REMINDER",
      summary: `${admin.name} sent a renewal reminder for ${member?.name || userId}.`,
    },
  });
  redirect(withQuery(adminReturn(formData, `/admin/members/${userId}`), "notice", "Renewal reminder is in the Outbox"));
}

export async function sendFailedPaymentNotice(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  await markPaymentFailed(userId);
  const member = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "FAILED_PAYMENT_NOTICE",
      summary: `${admin.name} recorded a failed dues payment for ${member?.name || userId}.`,
    },
  });
  redirect(withQuery(adminReturn(formData, `/admin/members/${userId}`), "notice", "Failed-payment notice is in the Outbox"));
}

export async function openBillingPortal() {
  const user = await requireAccount();
  if (blocksMembership(user.paymentStatus)) redirect("/pay");
  const secret = process.env.STRIPE_SECRET_KEY || "";
  if (!secret || !user.stripeCustomerId) redirect("/settings?error=No+Stripe+customer+is+on+this+account");
  const base = await appBaseUrl();
  const portal = await createBillingPortal({ secret, customerId: user.stripeCustomerId, returnUrl: `${base}/settings` });
  if (!portal.ok) redirect(`/settings?error=${encodeURIComponent(portal.error)}`);
  redirect(portal.value.url);
}
