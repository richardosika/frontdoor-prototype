import { Suspense } from "react";
import { Shell } from "@/components/shell";
import { ActionDonePopup } from "@/components/report-sent";
import { isDeveloperRole } from "@/lib/member-reach";
import { requireUser } from "@/lib/current-user";
import { enforceMemberNda } from "@/lib/member-nda-gate";
import { prisma } from "@/lib/prisma";
import { memberAlertWhere } from "@/lib/member-alerts";
import { currentLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await enforceMemberNda(user);
  if (user.paymentStatus === "PAID" && user.renewalAt && !user.cancelRequestedAt) {
    const { maybeSendFullPriceReminder } = await import("@/lib/payment-record");
    await maybeSendFullPriceReminder(user.id).catch(() => {
      console.error("Could not send the full-price reminder");
    });
  }
  // Nov 10 (Julia): card-expiry emails 30 and 2 days out. A member's visit checks their card; an administrator's
  // visit checks every paid Stripe member, so the notice goes out even if the member does not sign in.
  if (user.paymentStatus === "PAID" || user.isAdmin) {
    try {
      const { cardExpirySweep } = await import("@/lib/billing-db");
      const ids = user.isAdmin
        ? (await prisma.user.findMany({ where: { paymentStatus: "PAID", cancelRequestedAt: null, paymentMethods: { some: { role: "PRIMARY", mode: "stripe", expYear: { gt: 0 } } } }, select: { id: true } })).map((row) => row.id)
        : [user.id];
      const base = await (await import("@/lib/url")).appBaseUrl();
      for (const id of ids) await cardExpirySweep(id, new Date(), base).catch(() => console.error("Could not run the card expiry sweep"));
    } catch {
      console.error("Could not run the card expiry sweep");
    }
  }
  if (user.pausedUntil || user.isAdmin) {
    // Members sweep their own pause; an administrator's visit also sweeps every paused membership,
    // so the resume reminder goes out even if the member does not sign in that week.
    const { billingSweep } = await import("@/lib/billing-db");
    const ids = user.isAdmin
      ? (await prisma.user.findMany({ where: { pausedUntil: { not: null } }, select: { id: true }, take: 200 })).map((row) => row.id)
      : [user.id];
    for (const id of ids) await billingSweep(id).catch(() => console.error("Could not run the billing sweep"));
  }
  const [unread, alerts, interestWaiting] = await Promise.all([
    prisma.message.count({
      where: {
        readAt: null,
        senderId: { not: user.id },
        conversation: { OR: [{ userAId: user.id }, { userBId: user.id }] },
      },
    }),
    prisma.notification.count({ where: { ...memberAlertWhere(user.id), readAt: null } }),
    // Nov 6: interest requests waiting on the developer's own projects, for the My Projects badge.
    isDeveloperRole(user.role)
      ? prisma.projectContact.count({ where: { toId: user.id, status: "PENDING", project: { userId: user.id } } })
      : Promise.resolve(0),
  ]);
  return (
    <Shell
      user={{ name: user.name, initials: user.initials, photoId: user.photoId, tier: user.tier, isAdmin: user.isAdmin, memberSince: user.createdAt.getFullYear(), role: user.role }}
      unread={unread}
      alerts={alerts}
      interestWaiting={interestWaiting}
      locale={await currentLocale()}
    >
      {children}
      <Suspense fallback={null}>
        <ActionDonePopup />
      </Suspense>
    </Shell>
  );
}
