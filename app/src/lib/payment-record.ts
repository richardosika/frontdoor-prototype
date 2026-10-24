import { annualDuesCents, duesLabel } from "@/lib/dues";
import { notify } from "@/lib/notify";
import { sendNotice } from "@/lib/notices";
import { renewalInOneYear } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/url";

/** Returns false when this processor event was already recorded. */
export async function claimPaymentEvent(id: string, userId: string | null, kind: string): Promise<boolean> {
  try {
    await prisma.paymentEvent.create({ data: { id, userId, kind } });
    return true;
  } catch {
    return false;
  }
}

export async function activatePaidMembership(input: {
  userId: string;
  mode: string;
  renewalAt?: Date | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  welcome?: boolean;
}) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return null;
  const first = user.paymentStatus !== "PAID" && user.paymentStatus !== "WAIVED";
  const renewalAt = input.renewalAt ?? renewalInOneYear();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      paymentStatus: "PAID",
      paidAt: user.paidAt ?? new Date(),
      renewalAt,
      paymentMode: input.mode,
      stripeCustomerId: input.stripeCustomerId || user.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId || user.stripeSubscriptionId,
    },
  });
  await prisma.application.updateMany({
    where: { userId: user.id, status: "PAYMENT_DUE" },
    data: { status: "APPROVED" },
  });
  if (first && input.welcome !== false) {
    const base = await appBaseUrl();
    await sendNotice({
      intendedTo: user.email,
      subject: "Your Private Floor membership is active",
      text: `Hello ${user.name},\n\nYour annual dues are recorded and your membership is active. Sign in at ${base}/login. The first-week checklist is on the feed.\n\nNo card number is stored by Private Floor.\n`,
    });
    await notify(user.id, {
      title: "Membership active",
      body: "Your dues are recorded. The floor is open.",
      href: "/feed",
    });
  }
  return { first, renewalAt };
}

export async function markPaymentFailed(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  await prisma.user.update({ where: { id: user.id }, data: { paymentStatus: "FAILED" } });
  const base = await appBaseUrl();
  const link = user.paymentToken ? `${base}/pay/${user.paymentToken}` : `${base}/pay`;
  await sendNotice({
    intendedTo: user.email,
    subject: "Private Floor dues payment did not go through",
    text: `Hello ${user.name},\n\nThe dues payment did not go through. No card number is stored. You can try again here: ${link}\n\nThe amount is still ${duesLabel(user.duesCents || annualDuesCents(user.role))}, a flat annual fee.\n`,
  });
  await notify(user.id, {
    title: "Payment did not go through",
    body: "Open the dues page to try again. No card number is stored.",
    href: "/pay",
  });
}

export async function sendRenewalReminder(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.renewalAt) return false;
  const base = await appBaseUrl();
  await sendNotice({
    intendedTo: user.email,
    subject: "Your Private Floor dues renew soon",
    text: `Hello ${user.name},\n\nYour flat annual dues of ${duesLabel(user.duesCents || annualDuesCents(user.role))} renew on ${user.renewalAt.toISOString().slice(0, 10)}. This is not a deal fee. Write to connect@privatefloorclub.com to cancel before that date.\n\nBilling: ${base}/settings\n`,
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastRenewalReminderAt: new Date() } });
  return true;
}
