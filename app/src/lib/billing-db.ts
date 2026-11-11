import { addMonths, pauseEnded, resumeReminderDue, resumeReminderEmail } from "@/lib/billing";
import { formatLongEtDate } from "@/lib/format";
import { memberLocale } from "@/lib/i18n/server";
import { firstName } from "@/lib/email-templates";
import { sendNotice } from "@/lib/notices";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/url";
import { cardExpiringEmail, cardExpiryDay, cardNoticeDue, expiryKey, type CardNoticeKind } from "@/lib/billing-emails";

/** Sends the resume reminder once and ends pauses that are over. Safe to call on every page load. */
export async function billingSweep(userId: string, now = new Date()): Promise<"none" | "reminded" | "resumed"> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, pausedAt: true, pausedUntil: true, pauseReminderSentAt: true, renewalAt: true },
  });
  if (!user?.pausedUntil) return "none";
  if (pauseEnded(user, now)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { pausedAt: null, pausedUntil: null, renewalAt: user.pausedUntil > (user.renewalAt ?? new Date(0)) ? user.pausedUntil : user.renewalAt },
    });
    return "resumed";
  }
  if (resumeReminderDue({ pausedUntil: user.pausedUntil, sentAt: user.pauseReminderSentAt, pausedAt: user.pausedAt, now })) {
    const locale = await memberLocale(user.id);
    const mail = resumeReminderEmail(locale, firstName(user.name), formatLongEtDate(user.pausedUntil));
    await sendNotice({ intendedTo: user.email, subject: mail.subject, text: mail.text });
    await prisma.user.update({ where: { id: user.id }, data: { pauseReminderSentAt: now } });
    return "reminded";
  }
  return "none";
}

export function pauseWindow(now: Date, months: number, renewalAt: Date | null) {
  // The pause starts at the end of the period already paid, so no paid days are lost.
  const start = renewalAt && renewalAt > now ? renewalAt : now;
  return { pausedAt: now, pausedUntil: addMonths(start, months) };
}

/**
 * Nov 10 (Julia): card-expiry emails, 30 days and 2 days before the membership card expires. Paid Stripe members
 * only, at most once per card expiry (a unique claim prevents concurrent duplicate attempts).
 * A failure after claiming requires manual review; the claim does not guarantee delivery.
 */
export async function cardExpirySweep(userId: string, now = new Date(), base?: string): Promise<CardNoticeKind | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, paymentStatus: true, cancelRequestedAt: true, paymentMethods: { where: { role: "PRIMARY", mode: "stripe" }, select: { expMonth: true, expYear: true } } },
  });
  const card = user?.paymentMethods[0];
  if (!user || !card || user.paymentStatus !== "PAID" || user.cancelRequestedAt) return null;
  const expKey = expiryKey(card.expMonth, card.expYear);
  const sentRows = await prisma.cardExpiryNotice.findMany({ where: { userId: user.id, expKey }, select: { kind: true } });
  const kind = cardNoticeDue({ expMonth: card.expMonth, expYear: card.expYear, now, sent: new Set(sentRows.map((r) => r.kind as CardNoticeKind)) });
  if (!kind) return null;
  const link = `${base || (await appBaseUrl())}/settings#billing`;
  const locale = await memberLocale(user.id);
  const mail = cardExpiringEmail(kind, { locale, name: firstName(user.name), expiresOn: cardExpiryDay(card.expMonth, card.expYear), link });
  const claimed = await prisma.cardExpiryNotice.create({ data: { userId: user.id, kind, expKey } }).catch((error: unknown) => {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return null;
    throw error;
  });
  if (!claimed) return null;
  await sendNotice({ intendedTo: user.email, subject: mail.subject, text: mail.text, templateKey: kind === "30" ? "card_expiring_30" : "card_expiring_2" });
  return kind;
}
