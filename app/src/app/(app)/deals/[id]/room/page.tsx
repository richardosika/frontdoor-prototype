import { serverTx } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addDealDocument, postDealQuestion, removeParticipant } from "@/actions/deals";
import { TierBadge } from "@/components/badge";
import { Banner } from "@/components/banner";
import { MobileTitle } from "@/components/page-header";
import { ModeratorNotice } from "@/components/moderator-notice";
import { btn, btnOutline, card, field, labelCls } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";
import { timeAgo } from "@/lib/format";
import { roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function DealRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const tx = await serverTx();
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      sponsor: true,
      access: { where: { status: "APPROVED" }, include: { requester: true } },
      documents: { orderBy: { createdAt: "desc" }, include: { author: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: true, replies: { include: { author: true }, orderBy: { createdAt: "asc" } } } },
      events: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!deal) notFound();
  const allowed = deal.sponsorId === user.id || deal.access.some((item) => item.requesterId === user.id);
  if (!allowed) redirect(`/deals/${deal.id}?error=${encodeURIComponent("The sponsor has not approved your access.")}`);

  const members = [
    deal.sponsor,
    ...deal.access.map((item) => item.requester).filter((person) => person.id !== deal.sponsorId),
  ];
  const questions = deal.messages.filter((message) => !message.parentId);

  return (
    <div>
      <MobileTitle href={`/deals/${deal.id}`} label="Deal" title={tx("Room")} />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <Link href={`/deals/${deal.id}`} className="hidden min-h-11 items-center text-sm text-mut md:inline-flex">
          ‹ {deal.title}
        </Link>
        <Banner error={query.error} notice={query.notice} />
        <div className={`mt-3 p-5 ${card}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Deal room")}</p>
          <h1 className="mt-1 font-serif text-2xl font-normal">{deal.title}</h1>
          <p className="mt-2 text-sm text-ink">
            Approved members and {deal.sponsor.name} can list documents, ask questions, and see what changed. {BRAND.name} stores the file name, type, and size. It does not keep the file and does not process a payment.
          </p>
          <ul className="mt-4 divide-y divide-line">
            {members.map((person) => (
              <li key={person.id} className="flex items-center justify-between gap-3 py-3">
                <Link href={`/members/${person.id}`} className="min-h-11">
                  <span className="font-semibold">{person.name}</span>
                  <span className="block text-xs text-mut">
                    {tx(roleShort(roleLabel(person.role)))} · {person.org}
                    {person.id === deal.sponsorId ? " · Sponsor" : ""}
                  </span>
                </Link>
                <span className="flex items-center gap-2">
                  <TierBadge tier={person.tier} />
                  {deal.sponsorId === user.id && person.id !== deal.sponsorId ? (
                    <form action={removeParticipant}>
                      <input type="hidden" name="dealId" value={deal.id} />
                      <input type="hidden" name="requesterId" value={person.id} />
                      <button className={btnOutline} type="submit">
                        {tx("Remove")}
                      </button>
                    </form>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <section className={`mt-4 p-5 ${card}`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Documents")}</h2>
          <p className="mt-1 text-xs text-mut">{tx("PDF, JPG, or PNG, 8 MB or smaller. Only the name, type, and size are stored.")}</p>
          {deal.documents.length === 0 ? <p className="mt-3 text-sm text-mut">{tx("No documents listed yet.")}</p> : null}
          <ul className="mt-3 divide-y divide-line">
            {deal.documents.map((document) => (
              <li key={document.id} className="py-3">
                <p className="font-semibold text-forest">{document.title}</p>
                <p className="text-xs text-mut">
                  {document.fileName || "File"} · {document.contentType || "unknown type"} · {document.sizeBytes ? `${Math.ceil(document.sizeBytes / 1024)} KB` : "size not recorded"} · {document.author.name} · {timeAgo(document.createdAt)}
                </p>
                {document.note ? <p className="mt-1 text-sm text-ink">{document.note}</p> : null}
              </li>
            ))}
          </ul>
          <form action={addDealDocument} className="mt-3 grid gap-2">
            <input type="hidden" name="dealId" value={deal.id} />
            <div>
              <label className={labelCls}>{tx("Title")}</label>
              <input name="title" className={field} placeholder={tx("Site sketch")} required />
            </div>
            <div>
              <label className={labelCls}>{tx("File")}</label>
              <input name="file" type="file" accept="application/pdf,image/jpeg,image/png" className="text-sm" required />
            </div>
            <div>
              <label className={labelCls}>{tx("Note")}</label>
              <input name="note" className={field} placeholder={tx("What this file is for")} />
            </div>
            <button className={btnOutline} type="submit">
              {tx("List document")}
            </button>
          </form>
        </section>

        <section className={`mt-4 p-5 ${card}`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Questions")}</h2>
          {questions.length === 0 ? <p className="mt-3 text-sm text-mut">{tx("No questions yet.")}</p> : null}
          <ul className="mt-3 space-y-4">
            {questions.map((question) => (
              <li key={question.id} className="rounded border border-line bg-cream px-3 py-3">
                <p className="text-sm text-ink">{question.body}</p>
                <p className="mt-1 text-xs text-mut">
                  {question.author.name} · {timeAgo(question.createdAt)}
                </p>
                <ul className="mt-2 space-y-2">
                  {question.replies.map((reply) => (
                    <li key={reply.id} className="rounded border border-line bg-paper px-3 py-2">
                      <p className="text-sm text-ink">{reply.body}</p>
                      <p className="mt-1 text-xs text-mut">
                        {reply.author.name}
                        {reply.authorId === deal.sponsorId ? " · Sponsor" : ""} · {timeAgo(reply.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
                <form action={postDealQuestion} className="mt-2 flex gap-2">
                  <input type="hidden" name="dealId" value={deal.id} />
                  <input type="hidden" name="parentId" value={question.id} />
                  <input name="body" className={field} placeholder={tx("Reply")} required />
                  <button className={btn} type="submit">
                    {tx("Reply")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <form action={postDealQuestion} className="mt-4 space-y-2">
            <input type="hidden" name="dealId" value={deal.id} />
            <label className={labelCls}>{tx("Ask the room")}</label>
            <textarea name="body" className={field} rows={3} placeholder={tx("A question for the sponsor or the other approved members")} required />
            <button className={btn} type="submit">
              {tx("Post question")}
            </button>
            <ModeratorNotice />
          </form>
        </section>

        <section className={`mt-4 p-5 ${card}`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Activity")}</h2>
          {deal.events.length === 0 ? <p className="mt-3 text-sm text-mut">{tx("Nothing recorded yet.")}</p> : null}
          <ul className="mt-3 divide-y divide-line">
            {deal.events.map((event) => (
              <li key={event.id} className="py-2 text-sm text-ink">
                {event.summary}
                <span className="block text-xs text-mut">{timeAgo(event.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
