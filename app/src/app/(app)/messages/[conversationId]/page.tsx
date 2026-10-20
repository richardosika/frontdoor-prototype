import { notFound } from "next/navigation";
import { sendMessage } from "@/actions/social";
import { Banner } from "@/components/banner";
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
      <section className="flex min-h-[70dvh] flex-col bg-white lg:min-h-dvh">
        <header className="bg-navy px-4 py-3 text-white">
          <a href="/messages" className="text-sm text-[#C4CCDD] lg:hidden">
            ‹ Messages
          </a>
          <h1 className="font-serif text-lg">{other.name}</h1>
          <p className="text-xs text-[#C4CCDD]">
            {roleLabel(other.role)} · {other.location}
          </p>
        </header>
        <div className="flex-1 space-y-2 px-4 py-4">
          <Banner error={query.error} />
          {conversation.messages.length === 0 ? <p className="text-center text-sm text-mut">Say hello to {other.name}.</p> : null}
          {conversation.messages.map((message) => {
            const mine = message.senderId === user.id;
            return (
              <div
                key={message.id}
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                  mine ? "ml-auto rounded-tr-sm bg-navy text-white" : "rounded-tl-sm border border-line bg-white"
                }`}
              >
                {message.body}
              </div>
            );
          })}
        </div>
        <form action={sendMessage} className="flex gap-2 border-t border-line p-3">
          <input type="hidden" name="conversationId" value={conversation.id} />
          <input name="body" className={`${field} rounded-full`} placeholder={`Message ${other.name.split(" ")[0]}…`} required />
          <button className={btn} type="submit">
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
