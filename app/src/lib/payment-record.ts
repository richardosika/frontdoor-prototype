import { currentMonthlyCents, firstMonthCents, formatMoney, mailDuesAmounts } from "@/lib/dues";
import { RECEIPT_SUBJECT } from "@/lib/email-layout";
import { SIGN_OFF } from "@/lib/email-templates";
import { ensureCrmPerson } from "@/lib/crm";
import { formatLongEtDate } from "@/lib/format";
import { givenNameFrom } from "@/lib/person-fields";
import { buildMailVars, sendTemplate } from "@/lib/mail";
import { notify } from "@/lib/notify";
import { sendNotice } from "@/lib/notices";
import { renewalInOneMonth, renewalReminderDue } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";
import { appBaseUrl } from "@/lib/url";

/** Plain-text receipt. Amounts stay. The founder sign-off and sign-in link match the other letters. */
export function paymentReceiptText(input: {
  firstName: string;
  role: string;
  firstCharge: string;
  monthly: string;
  renewal: string;
  modeLine: string;
  loginLink: string;
}): string {
  return `Hello ${input.firstName},

Receipt. First month ${input.firstCharge} recorded for ${input.role}. Full price ${input.monthly} per month starts ${input.renewal}. Month to month. No long-term contract. Cancel anytime in Settings before that date. A reminder goes out before the full-price charge. ${input.modeLine}

Sign in
${input.loginLink}

${SIGN_OFF}
`;
}

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
  const renewalAt = input.renewalAt ?? renewalInOneMonth();
  const monthlyCents = currentMonthlyCents(user.role, user.duesCents);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      paymentStatus: "PAID",
      paidAt: user.paidAt ?? new Date(),
      renewalAt,
      duesCents: monthlyCents,
      paymentMode: input.mode,
      cancelRequestedAt: null,
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
    const firstCharge = formatMoney(firstMonthCents(monthlyCents));
    const modeLine =
      input.mode === "stripe"
        ? "Recorded from Stripe test mode. The card number stays at Stripe."
        : input.mode === "manual"
          ? "Marked paid by a Private Floor administrator. No card is stored."
          : "Recorded as a simulated TEST payment. No card was charged.";
    await sendNotice({
      intendedTo: user.email,
      subject: RECEIPT_SUBJECT,
      text: paymentReceiptText({
        firstName: givenNameFrom("", user.name),
        role: roleLabel(user.role),
        firstCharge,
        monthly: formatMoney(monthlyCents),
        renewal: formatLongEtDate(renewalAt),
        modeLine,
        loginLink: `${base}/login`,
      }),
      templateKey: "payment_due",
    });
  }
  return { first, renewalAt };
}

/** Failed-payment letter. Nothing was collected, so there is no next charge date. */
export function failedPaymentNotice(input: { firstName: string; paymentLink: string }): { subject: string; text: string } {
  return {
    subject: "Your Private Floor payment did not go through",
    text: `Hello ${input.firstName},

The payment did not go through. Nothing was charged. No card number is stored.

Pay membership dues
${input.paymentLink}

${SIGN_OFF}
`,
  };
}

export async function markPaymentFailed(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  await prisma.user.update({ where: { id: user.id }, data: { paymentStatus: "FAILED" } });
  const base = await appBaseUrl();
  const link = user.paymentToken ? `${base}/pay/${user.paymentToken}` : `${base}/pay`;
  const letter = failedPaymentNotice({
    firstName: givenNameFrom("", user.name),
    paymentLink: link,
  });
  await ensureCrmPerson({
    email: user.email,
    name: user.name,
    role: user.role,
    org: user.org,
    location: user.location,
  });
  await sendNotice({
    intendedTo: user.email,
    subject: letter.subject,
    text: letter.text,
    templateKey: "payment_failed",
  });
  await notify(user.id, {
    title: "Payment did not go through",
    body: "Open the dues page to try again. No card number is stored.",
    href: "/pay",
  });
}

export async function sendRenewalReminder(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.renewalAt || user.cancelRequestedAt) return false;
  const base = await appBaseUrl();
  const amounts = mailDuesAmounts(user.role, user.duesCents);
  await sendTemplate({
    key: "renewal",
    to: user.email,
    vars: buildMailVars({
      name: user.name,
      role: roleLabel(user.role),
      duesAmount: amounts.duesAmount,
      introAmount: amounts.introAmount,
      renewalDate: formatLongEtDate(user.renewalAt),
      billingLink: `${base}/settings`,
    }),
    person: { name: user.name, role: user.role, org: user.org, location: user.location },
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastRenewalReminderAt: new Date() } });
  return true;
}

/** Sends the full-price reminder once, in the week before that charge, when cancellation is not recorded. */
export async function maybeSendFullPriceReminder(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { paymentStatus: true, renewalAt: true, lastRenewalReminderAt: true, cancelRequestedAt: true },
  });
  if (!user || user.paymentStatus !== "PAID" || user.cancelRequestedAt) return false;
  if (!renewalReminderDue({ renewalAt: user.renewalAt, lastSentAt: user.lastRenewalReminderAt })) return false;
  return sendRenewalReminder(userId);
}
