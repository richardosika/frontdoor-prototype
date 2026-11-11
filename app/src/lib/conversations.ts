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
      photoId: other.photoId ?? "",
      // Nov 10: LinkedIn-style list: "You: …" when the latest message is yours; Sent lists those conversations.
      lastFromMe: Boolean(last && last.senderId === userId),
    };
  });
}

export type ConversationRow = Awaited<ReturnType<typeof listConversations>>[number];

/** Nov 10 (Julia): Inbox and Sent like LinkedIn messages. Inbox: every conversation. Sent: the latest message is yours. Search by name or company. */
export function filterConversations<T extends { name: string; sub: string; lastFromMe: boolean }>(rows: T[], tab: "inbox" | "sent", q = ""): T[] {
  const needle = q.trim().toLowerCase();
  return rows.filter((row) => (tab === "sent" ? row.lastFromMe : true)).filter((row) => !needle || `${row.name} ${row.sub}`.toLowerCase().includes(needle));
}

/** Sent requests share the Sent tab with conversations, so both determine its count and empty state. */
export function conversationListState<T extends { name: string; sub: string; lastFromMe: boolean }>(conversations: T[], tab: "inbox" | "sent", q = "", requestsSent = 0) {
  const rows = filterConversations(conversations, tab, q);
  const sentCount = conversations.filter((c) => c.lastFromMe).length + requestsSent;
  const showEmpty = rows.length === 0 && Boolean(q || tab !== "sent" || requestsSent === 0);
  return { rows, sentCount, showEmpty };
}
