import { annualDuesCents, duesLabel } from "@/lib/dues";
import { formatEtDate } from "@/lib/format";
import { buildMailVars, sendTemplate } from "@/lib/mail";
import { notify } from "@/lib/notify";
import { paymentRenewalLabel, renewalInOneYear } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";
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
    await sendTemplate({
      key: "welcome",
      to: user.email,
      vars: buildMailVars({
        name: user.name,
        role: roleLabel(user.role),
        org: user.org,
        loginLink: `${base}/login`,
      }),
      person: { name: user.name, role: user.role, org: user.org, location: user.location },
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
  await sendTemplate({
    key: "dues_reminder",
    to: user.email,
    vars: buildMailVars({
      name: user.name,
      role: roleLabel(user.role),
      duesAmount: duesLabel(user.duesCents || annualDuesCents(user.role)),
      renewalDate: paymentRenewalLabel(user.renewalAt),
      paymentLink: link,
    }),
    person: { name: user.name, role: user.role, org: user.org, location: user.location },
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
  await sendTemplate({
    key: "renewal",
    to: user.email,
    vars: buildMailVars({
      name: user.name,
      role: roleLabel(user.role),
      duesAmount: duesLabel(user.duesCents || annualDuesCents(user.role)),
      renewalDate: formatEtDate(user.renewalAt),
      billingLink: `${base}/settings`,
    }),
    person: { name: user.name, role: user.role, org: user.org, location: user.location },
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastRenewalReminderAt: new Date() } });
  return true;
}
