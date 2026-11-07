import { verificationActor } from "@/lib/current-user";
import { inboxResponse, type MemberRecord } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const memberSelect = {
  id: true,
  name: true,
  initials: true,
  org: true,
  location: true,
  role: true,
  tier: true,
  bio: true,
  credentialNote: true,
  email: true,
  phone: true,
  linkedinUrl: true,
} as const;

export async function GET() {
  const actor = await verificationActor();
  if (!actor) return inboxResponse({ viewer: null, threads: [] });
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: actor.id }, { userBId: actor.id }] },
    include: {
      userA: { select: memberSelect },
      userB: { select: memberSelect },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  const unread = await prisma.message.groupBy({
    by: ["conversationId"],
    where: { readAt: null, senderId: { not: actor.id }, conversation: { OR: [{ userAId: actor.id }, { userBId: actor.id }] } },
    _count: true,
  });
  const unreadMap = new Map(unread.map((row) => [row.conversationId, row._count]));
  return inboxResponse({
    viewer: { id: actor.id },
    threads: conversations.map((conversation) => {
      const other = conversation.userAId === actor.id ? conversation.userB : conversation.userA;
      return {
        id: conversation.id,
        preview: conversation.messages[0]?.body ?? "",
        unread: unreadMap.get(conversation.id) ?? 0,
        member: other as MemberRecord,
      };
    }),
  });
}
