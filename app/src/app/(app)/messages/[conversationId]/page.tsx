import { SubmitButton } from "@/components/submit-button";
import { serverTx } from "@/lib/i18n/server";
import { memberLine } from "@/lib/member-line";
import Link from "next/link";
import { notFound } from "next/navigation";
import { respondConnection, sendMessage, withdrawConnection } from "@/actions/social";
import { BlockButton, UnblockButton } from "@/components/block-controls";
import { Avatar } from "@/components/avatar";
import { Banner } from "@/components/banner";
import { TierBadge } from "@/components/badge";
import { ConversationList } from "@/components/conversation-list";
import { ReportDialog } from "@/components/report-dialog";
import { btn, btnOutline, field } from "@/components/ui";
import { renderCircleMessage } from "@/lib/circle-requests";
import { requireUser } from "@/lib/current-user";
import { listConversations } from "@/lib/conversations";
import { ModeratorNotice } from "@/components/moderator-notice";
import { isRenderedSystemNotice, systemNoticeLabelFor } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const tx = await serverTx();
  const user = await requireUser();
  const { conversationId } = await params;
  const query = await searchParams;
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      userA: { select: { id: true, name: true, initials: true, photoId: true, role: true, location: true, tier: true } },
      userB: { select: { id: true, name: true, initials: true, photoId: true, role: true, location: true, tier: true } },
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
  const [conversations, circleRequest] = await Promise.all([
    listConversations(user.id),
    // Nov 16 (Julia, step 24): a pending circle request between the two shows here with Withdraw, or Accept and Decline.
    prisma.connection.findFirst({
      where: { status: "PENDING", OR: [{ fromId: user.id, toId: other.id }, { fromId: other.id, toId: user.id }] },
      select: { id: true, fromId: true },
    }),
  ]);
  const threadPath = `/messages/${conversation.id}`;

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <ConversationList conversations={conversations} activeId={conversation.id} />
      </div>
      <section className="flex flex-col bg-cream max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-20 max-md:bottom-[calc(3.4rem+env(safe-area-inset-bottom,0px))] md:min-h-dvh md:bg-paper">
        <header className="safe-top flex items-center gap-3 border-b border-line bg-paper px-4 pb-3 md:py-3">
          <Link href="/messages" className="inline-flex min-h-11 min-w-11 items-center text-sm text-mut lg:hidden">
            ‹
          </Link>
          <Avatar initials={other.initials} photoId={other.photoId} size="sm" />
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 font-serif text-lg font-normal">
              {other.name} <TierBadge tier={other.tier} />
            </h1>
            <p className="truncate text-xs text-mut">
              {memberLine(other, tx)}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            {blockedByViewer ? (
              <UnblockButton userId={other.id} conversationId={conversation.id} className={btn} />
            ) : (
              <BlockButton userId={other.id} conversationId={conversation.id} className={btn} />
            )}
          </div>
        </header>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
          <Banner error={query.error ? tx(query.error) : undefined} notice={query.notice ? tx(query.notice) : undefined} />
          {circleRequest && !messagingClosed ? (
            <section className="rounded border border-line bg-paper p-3 text-sm" data-testid="thread-circle-request">
              {circleRequest.fromId === user.id ? (
                <>
                  <p className="font-semibold text-forest">{tx("Circle request sent")}</p>
                  <p className="mt-0.5 text-mut" data-testid="thread-circle-status">{tx("Waiting for a reply")}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <form action={withdrawConnection}>
                      <input type="hidden" name="connectionId" value={circleRequest.id} />
                      <input type="hidden" name="back" value={threadPath} />
                      <SubmitButton className={`${btnOutline} min-h-11 whitespace-normal`} pendingLabel="Withdrawing…" data-testid="thread-withdraw">{tx("Withdraw request")}</SubmitButton>
                    </form>
                    <Link href={`/messages/sent/connection/${circleRequest.id}`} className="inline-flex min-h-11 items-center text-forest underline decoration-brass">{tx("View request")}</Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-semibold text-forest">{tx("{name} asked to join your circle.").replace("{name}", other.name)}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:flex">
                    <form action={respondConnection}>
                      <input type="hidden" name="connectionId" value={circleRequest.id} />
                      <input type="hidden" name="back" value={threadPath} />
                      <SubmitButton className={`${btnOutline} min-h-11 w-full`} name="decision" value="DECLINED" data-testid="thread-circle-decline">{tx("Decline")}</SubmitButton>
                    </form>
                    <form action={respondConnection}>
                      <input type="hidden" name="connectionId" value={circleRequest.id} />
                      <input type="hidden" name="back" value={threadPath} />
                      <SubmitButton className={`${btn} min-h-11 w-full`} name="decision" value="ACCEPTED" data-testid="thread-circle-accept">{tx("Accept")}</SubmitButton>
                    </form>
                  </div>
                </>
              )}
            </section>
          ) : null}
          {conversation.messages.length === 0 ? <p className="text-center text-sm text-mut">{tx("Say hello to {name}.").replace("{name}", other.name)}</p> : null}
          {conversation.messages.map((message) => {
            if (isRenderedSystemNotice(message.kind, message.body)) {
              return (
                <article key={message.id} className="rounded border border-brass border-l-4 bg-cream px-3 py-3 text-sm text-ink">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("System")} · {tx(systemNoticeLabelFor(message.kind, message.body))}</p>
                  <p className="mt-1 leading-snug">{message.kind === "CONNECTION" ? renderCircleMessage(message.body, user.role, tx) : message.body}</p>
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
            <p className="mb-3 text-sm text-mut">{tx("Messaging is closed between these members.")}</p>
          ) : (
            <>
              <form action={sendMessage} className="mb-3 flex gap-2">
                <input type="hidden" name="conversationId" value={conversation.id} />
                <input name="body" className={field} placeholder={`Message ${other.name.split(" ")[0]}…`} required />
                <SubmitButton className={btn} pendingLabel="Sending…">
                  {tx("Send")}
                </SubmitButton>
              </form>
              <div className="mb-3">
                <ModeratorNotice />
              </div>
            </>
          )}
          <ReportDialog userId={other.id} conversationId={conversation.id} label={tx("Report")} />
        </div>
      </section>
    </div>
  );
}
