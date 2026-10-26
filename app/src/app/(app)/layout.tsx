import { Shell } from "@/components/shell";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.paymentStatus === "PAID" && user.renewalAt && !user.cancelRequestedAt) {
    const { maybeSendFullPriceReminder } = await import("@/lib/payment-record");
    await maybeSendFullPriceReminder(user.id).catch(() => {
      console.error("Could not send the full-price reminder");
    });
  }
  const [unread, alerts] = await Promise.all([
    prisma.message.count({
      where: {
        readAt: null,
        senderId: { not: user.id },
        conversation: { OR: [{ userAId: user.id }, { userBId: user.id }] },
      },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return (
    <Shell
      user={{ name: user.name, initials: user.initials, tier: user.tier, isAdmin: user.isAdmin }}
      unread={unread}
      alerts={alerts}
    >
      {children}
    </Shell>
  );
}
