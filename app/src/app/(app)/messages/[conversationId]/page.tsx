import Link from "next/link";
import { notFound } from "next/navigation";
import { blockMember, sendMessage, unblockMember } from "@/actions/social";
import { Avatar } from "@/components/avatar";
import { Banner } from "@/components/banner";
import { TierBadge } from "@/components/badge";
import { ConversationList } from "@/components/conversation-list";
import { ReportDialog } from "@/components/report-dialog";
import { btn, field } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { listConversations } from "@/lib/conversations";
import { isSystemNotice, systemNoticeLabel } from "@/lib/messaging";
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
      userA: { select: { id: true, name: true, initials: true, role: true, location: true, tier: true } },
      userB: { select: { id: true, name: true, initials: true, role: true, location: true, tier: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation || (conversation.userAId !== user.id && conversation.userBId !== user.id)) notFound();
  const blocks = await prisma.block.findMany({
    where: {
      OR: [
        { blockerId: user.id, blockedId: conversation.userAId === user.id ? conversation.userBId : conversation.userAId },
        { blockerId: conversation.userAId === user.id ? conversation.userBId : conversation.userAId, blockedId: user.id },
      ],
    },
    select: { blockerId: true },
  });

  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  const other = conversation.userAId === user.id ? conversation.userB : conversation.userA;
  const blockedByViewer = blocks.some((item) => item.blockerId === user.id);
  const messagingClosed = blocks.length > 0;
  const conversations = await listConversations(user.id);

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <ConversationList conversations={conversations} activeId={conversation.id} />
      </div>
      <section className="flex flex-col bg-cream max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-20 max-md:bottom-[calc(3.4rem+env(safe-area-inset-bottom,0px))] md:min-h-dvh md:bg-paper">
        <header className="safe-top flex items-center gap-3 border-b border-line bg-paper px-4 pb-3 md:py-3">
          <Link href="/messages" className="inline-flex min-h-11 min-w-11 items-center text-sm text-mut lg:hidden">
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
          <div className="ml-auto flex gap-2">
            {blockedByViewer ? (
              <form action={unblockMember}>
                <input type="hidden" name="userId" value={other.id} />
                <input type="hidden" name="conversationId" value={conversation.id} />
                <button className={btn} type="submit">
                  Unblock
                </button>
              </form>
            ) : (
              <form action={blockMember}>
                <input type="hidden" name="userId" value={other.id} />
                <input type="hidden" name="conversationId" value={conversation.id} />
                <button className={btn} type="submit">
                  Block
                </button>
              </form>
            )}
          </div>
        </header>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
          <Banner error={query.error} />
          {conversation.messages.length === 0 ? <p className="text-center text-sm text-mut">Say hello to {other.name}.</p> : null}
          {conversation.messages.map((message) => {
            if (isSystemNotice(message.kind)) {
              return (
                <article key={message.id} className="rounded border border-brass border-l-4 bg-cream px-3 py-3 text-sm text-ink">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brass">System · {systemNoticeLabel(message.kind)}</p>
                  <p className="mt-1 leading-snug">{message.body}</p>
                </article>
              );
            }
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
        <div className="border-t border-line bg-paper p-3">
          {messagingClosed ? (
            <p className="mb-3 text-sm text-mut">Messaging is closed between these members.</p>
          ) : (
            <form action={sendMessage} className="mb-3 flex gap-2">
              <input type="hidden" name="conversationId" value={conversation.id} />
              <input name="body" className={field} placeholder={`Message ${other.name.split(" ")[0]}…`} required />
              <button className={btn} type="submit">
                Send
              </button>
            </form>
          )}
          <ReportDialog userId={other.id} conversationId={conversation.id} label="Report" />
        </div>
      </section>
    </div>
  );
}
