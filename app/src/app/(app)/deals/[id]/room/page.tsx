import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addDealDocument, postDealQuestion } from "@/actions/deals";
import { addDealFolder, addToDealTeam, removeFromDealTeam } from "@/actions/deal-team";
import { TierBadge } from "@/components/badge";
import { Banner } from "@/components/banner";
import { MobileTitle } from "@/components/page-header";
import { ModeratorNotice } from "@/components/moderator-notice";
import { btn, btnOutline, card, field, labelCls } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";
import { timeAgo } from "@/lib/format";
import { PLATFORM_NDA_NOTICE, TEAM_ROLE_LABELS, type TeamRoleId } from "@/lib/platform/deal-team";
import { roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function DealRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      sponsor: true,
      access: { where: { status: "APPROVED" }, include: { requester: true } },
      documents: { orderBy: { createdAt: "desc" }, include: { author: true, folder: true } },
      team: { include: { user: { select: { id: true, name: true, role: true, org: true, tier: true } } } },
      folders: { orderBy: { sortOrder: "asc" } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: true, replies: { include: { author: true }, orderBy: { createdAt: "asc" } } } },
      events: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!deal) notFound();
  const allowed = user.isAdmin || deal.sponsorId === user.id || deal.access.some((item) => item.requesterId === user.id);
  if (!allowed) redirect(`/deals/${deal.id}?error=${encodeURIComponent("The sponsor has not approved your access.")}`);

  const members = [
    deal.sponsor,
    ...deal.access.map((item) => item.requester).filter((person) => person.id !== deal.sponsorId),
  ];
  const questions = deal.messages.filter((message) => !message.parentId);
  const isSponsor = deal.sponsorId === user.id;
  const partners = isSponsor
    ? await prisma.conversation.findMany({
        where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
        select: { userA: { select: { id: true, name: true } }, userB: { select: { id: true, name: true } } },
        take: 40,
      })
    : [];
  const partnerOptions = partners
    .map((row) => (row.userA.id === user.id ? row.userB : row.userA))
    .filter((person) => person.id !== user.id);
  const logs = isSponsor || user.isAdmin
    ? await prisma.documentAccessLog.findMany({
        where: { document: { dealId: deal.id } },
        orderBy: { at: "desc" },
        take: 30,
      })
    : [];
  const logNames = logs.length
    ? await prisma.user.findMany({ where: { id: { in: logs.map((row) => row.userId) } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(logNames.map((row) => [row.id, row.name]));

  return (
    <div>
      <MobileTitle href={`/deals/${deal.id}`} label="Deal" title="Room" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <Link href={`/deals/${deal.id}`} className="hidden min-h-11 items-center text-sm text-mut md:inline-flex">
          ‹ {deal.title}
        </Link>
        <Banner error={query.error} notice={query.notice} />
        <div className={`mt-3 p-5 ${card}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Deal room</p>
          <h1 className="mt-1 font-serif text-2xl font-normal">{deal.title}</h1>
          <p className="mt-2 text-sm text-ink">
            The deal team can store documents here. Raise amounts stay in this room. {PLATFORM_NDA_NOTICE} {BRAND.name} does not process a payment.
          </p>
          <ul className="mt-4 divide-y divide-line">
            {members.map((person) => (
              <li key={person.id} className="flex items-center justify-between gap-3 py-3">
                <Link href={`/members/${person.id}`} className="min-h-11">
                  <span className="font-semibold">{person.name}</span>
                  <span className="block text-xs text-mut">
                    {roleShort(roleLabel(person.role))} · {person.org}
                    {person.id === deal.sponsorId ? " · Sponsor" : ""}
                  </span>
                </Link>
                <span className="flex items-center gap-2">
                  <TierBadge tier={person.tier} />
                  {deal.sponsorId === user.id && person.id !== deal.sponsorId ? (
                    <form action={removeFromDealTeam}>
                      <input type="hidden" name="dealId" value={deal.id} />
                      <input type="hidden" name="userId" value={person.id} />
                      <button className={btnOutline} type="submit">
                        Remove from deal team
                      </button>
                    </form>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {deal.kind === "DEAL" ? (
          <p className="mt-4 text-sm text-ink">
            Raise {deal.raiseLabel}
            {deal.targetIrr ? ` · ${deal.targetIrr}` : ""}
            {deal.minCheck ? ` · ${deal.minCheck}` : ""}
            {deal.equityMultiple ? ` · ${deal.equityMultiple}` : ""}. These figures stay in the deal room.
          </p>
        ) : null}
        {isSponsor ? (
          <form action={addToDealTeam} className={`mt-4 grid gap-2 p-4 ${card}`}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Add to deal team</h2>
            <p className="text-xs text-mut">This sends an in-app request to someone you can already message. It does not send a separate email.</p>
            <select name="userId" className={field} required>
              <option value="">Choose a member</option>
              {partnerOptions.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <input type="hidden" name="dealId" value={deal.id} />
            <select name="teamRole" className={field} defaultValue="OTHER">
              {Object.entries(TEAM_ROLE_LABELS)
                .filter(([id]) => id !== "SPONSOR")
                .map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
            </select>
            <button className={btn} type="submit">
              Add to deal team
            </button>
          </form>
        ) : null}
        {isSponsor ? (
          <form action={addDealFolder} className={`mt-4 grid gap-2 p-4 ${card}`}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Folder</h2>
            <input type="hidden" name="dealId" value={deal.id} />
            <input name="name" className={field} placeholder="Folder name" required />
            <button className={btnOutline} type="submit">
              Add folder
            </button>
          </form>
        ) : null}
        <section className={`mt-4 p-5 ${card}`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Documents</h2>
          <p className="mt-1 text-xs text-mut">Files stay on the local disk for this test. Open a file and the access log records it. Acknowledge the platform NDA before documents open.</p>
          {deal.documents.length === 0 ? <p className="mt-3 text-sm text-mut">No documents listed yet.</p> : null}
          <ul className="mt-3 divide-y divide-line">
            {deal.documents.map((document) => (
              <li key={document.id} className="py-3">
                <p className="font-semibold text-forest">{document.title}</p>
                <p className="text-xs text-mut">
                  {document.fileName || "File"} · {document.contentType || "unknown type"} · {document.sizeBytes ? `${Math.ceil(document.sizeBytes / 1024)} KB` : "size not recorded"} · {document.author.name} · {timeAgo(document.createdAt)}
                </p>
                {document.folder ? <p className="text-xs text-mut">{document.folder.name}</p> : null}
                {document.note ? <p className="mt-1 text-sm text-ink">{document.note}</p> : null}
                {document.storageKey ? (
                  <a className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brass" href={`/api/deals/${deal.id}/files/${document.id}?download=1`}>
                    Download
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          <form action={addDealDocument} className="mt-3 grid gap-2">
            <input type="hidden" name="dealId" value={deal.id} />
            <div>
              <label className={labelCls}>Title</label>
              <input name="title" className={field} placeholder="Site sketch" required />
            </div>
            <div>
              <label className={labelCls}>File</label>
              <input name="file" type="file" accept="application/pdf,image/jpeg,image/png" className="text-sm" required />
            </div>
            <div>
              <label className={labelCls}>Note</label>
              <input name="note" className={field} placeholder="What this file is for" />
            </div>
            {isSponsor ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="sponsorOnly" />
                Sponsor only
              </label>
            ) : null}
            <button className={btnOutline} type="submit">
              Add document
            </button>
          </form>
        </section>

        {isSponsor || user.isAdmin ? (
          <section className={`mt-4 p-5 ${card}`}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">File access log</h2>
            {logs.length === 0 ? <p className="mt-3 text-sm text-mut">No file has been opened.</p> : null}
            <ul className="mt-3 divide-y divide-line">
              {logs.map((row) => (
                <li key={row.id} className="py-2 text-sm">
                  {nameById.get(row.userId) || "Member"} · {row.action} · {timeAgo(row.at)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section className={`mt-4 p-5 ${card}`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Questions</h2>
          {questions.length === 0 ? <p className="mt-3 text-sm text-mut">No questions yet.</p> : null}
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
                  <input name="body" className={field} placeholder="Reply" required />
                  <button className={btn} type="submit">
                    Reply
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <form action={postDealQuestion} className="mt-4 space-y-2">
            <input type="hidden" name="dealId" value={deal.id} />
            <label className={labelCls}>Ask the room</label>
            <textarea name="body" className={field} rows={3} placeholder="A question for the sponsor or the other approved members" required />
            <button className={btn} type="submit">
              Post question
            </button>
            <ModeratorNotice />
          </form>
        </section>

        <section className={`mt-4 p-5 ${card}`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Activity</h2>
          {deal.events.length === 0 ? <p className="mt-3 text-sm text-mut">Nothing recorded yet.</p> : null}
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
