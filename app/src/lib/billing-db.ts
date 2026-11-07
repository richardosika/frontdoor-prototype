import { addMonths, pauseEnded, resumeReminderDue, resumeReminderEmail } from "@/lib/billing";
import { formatLongEtDate } from "@/lib/format";
import { memberLocale } from "@/lib/i18n/server";
import { firstName } from "@/lib/email-templates";
import { sendNotice } from "@/lib/notices";
import { prisma } from "@/lib/prisma";

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
