import { Shell } from "@/components/shell";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await prisma.message.count({
    where: {
      readAt: null,
      senderId: { not: user.id },
      conversation: { OR: [{ userAId: user.id }, { userBId: user.id }] },
    },
  });
  return (
    <Shell user={{ name: user.name, initials: user.initials, tier: user.tier, isAdmin: user.isAdmin }} unread={unread}>
      {children}
    </Shell>
  );
}
