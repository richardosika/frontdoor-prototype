import Link from "next/link";
import { notFound } from "next/navigation";
import { sendMessage } from "@/actions/social";
import { Avatar } from "@/components/avatar";
import { Banner } from "@/components/banner";
import { TierBadge } from "@/components/badge";
import { ConversationList } from "@/components/conversation-list";
import { btn, field } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { listConversations } from "@/lib/conversations";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { conversationId } = await params;
  const query = await searchParams;
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      userA: true,
      userB: true,
      messages: { orderBy: { createdAt: "asc" }, include: { sender: true } },
    },
  });
  if (!conversation || (conversation.userAId !== user.id && conversation.userBId !== user.id)) notFound();

  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  const other = conversation.userAId === user.id ? conversation.userB : conversation.userA;
  const conversations = await listConversations(user.id);

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <ConversationList conversations={conversations} activeId={conversation.id} />
      </div>
      <section className="flex min-h-[70dvh] flex-col bg-cream lg:min-h-dvh lg:bg-paper">
        <header className="safe-top flex items-center gap-3 border-b border-line bg-paper px-4 pb-3 md:py-3">
          <Link href="/messages" className="text-sm text-mut lg:hidden">
            ‹
          </Link>
          <Avatar initials={other.initials} size="sm" />
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 font-serif text-lg font-normal">
              {other.name} <TierBadge tier={other.tier} />
            </h1>
            <p className="truncate text-xs text-mut">
              {roleLabel(other.role)} · {other.location}
            </p>
          </div>
        </header>
        <div className="flex-1 space-y-2 px-4 py-4">
          <Banner error={query.error} />
          {conversation.messages.length === 0 ? <p className="text-center text-sm text-mut">Say hello to {other.name}.</p> : null}
          {conversation.messages.map((message) => {
            const mine = message.senderId === user.id;
            return (
              <div
                key={message.id}
                className={`max-w-[78%] rounded px-3 py-2 text-sm leading-snug ${
                  mine ? "ml-auto rounded-tr-sm bg-forest text-paper" : "rounded-tl-sm border border-line bg-paper"
                }`}
              >
                {message.body}
              </div>
            );
          })}
        </div>
        <form action={sendMessage} className="flex gap-2 border-t border-line p-3">
          <input type="hidden" name="conversationId" value={conversation.id} />
          <input name="body" className={field} placeholder={`Message ${other.name.split(" ")[0]}…`} required />
          <button className={btn} type="submit">
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
