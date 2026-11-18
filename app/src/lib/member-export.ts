import { prisma } from "@/lib/prisma";

/** One member's data for an administrator export: profile, posts, messages they sent, introductions, deal access. */
export async function memberExport(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const [posts, messages, introductions, access] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: user.id },
      select: { id: true, kind: true, status: true, title: true, body: true, market: true, createdAt: true },
    }),
    prisma.message.findMany({
      where: { senderId: user.id },
      select: { id: true, body: true, kind: true, createdAt: true, conversationId: true },
    }),
    prisma.introduction.findMany({
      where: { OR: [{ fromId: user.id }, { toId: user.id }] },
      select: { id: true, fromId: true, toId: true, note: true, status: true, createdAt: true },
    }),
    prisma.dealAccess.findMany({
      where: { requesterId: user.id },
      select: { dealId: true, status: true, ndaVersion: true, ndaAcknowledgedAt: true },
    }),
  ]);
  return {
      exportedAt: new Date().toISOString(),
    memberId: user.id,
      profile: {
        email: user.email,
        name: user.name,
        role: user.role,
        org: user.org,
        location: user.location,
        bio: user.bio,
        website: user.website,
        markets: user.markets,
        dealTypes: user.dealTypes,
        assetClasses: user.assetClasses,
        checkSize: user.checkSize,
        lookingFor: user.lookingFor,
        offering: user.offering,
        tier: user.tier,
      },
      posts,
      messagesSent: messages,
      introductions,
      dealAccess: access,
    };
}
