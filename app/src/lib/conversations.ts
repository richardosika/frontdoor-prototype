import { timeAgo, tierLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { roleLabel, roleShort } from "@/lib/roles";

export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: {
      userA: true,
      userB: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  const unread = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      readAt: null,
      senderId: { not: userId },
      conversation: { OR: [{ userAId: userId }, { userBId: userId }] },
    },
    _count: true,
  });
  const unreadMap = new Map(unread.map((row) => [row.conversationId, row._count]));
  return conversations.map((conversation) => {
    const other = conversation.userAId === userId ? conversation.userB : conversation.userA;
    const last = conversation.messages[0];
    return {
      id: conversation.id,
      name: other.name,
      initials: other.initials,
      sub: [other.org, roleShort(roleLabel(other.role)), other.location].filter(Boolean).join(" · "),
      preview: last?.body ?? "New conversation",
      time: last ? timeAgo(last.createdAt) : "",
      unread: unreadMap.get(conversation.id) ?? 0,
    };
  });
}
