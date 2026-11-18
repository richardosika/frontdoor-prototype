import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { requireModerationAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { moderationActionLabel } from "@/lib/moderation-label";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ModerationQueuePage() {
  const admin = await requireModerationAdmin();
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "OPENED_QUEUE",
      summary: `${admin.name} opened the message queue.`,
    },
  });
  const [conversations, reports, events] = await Promise.all([
    prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 40,
      include: {
        userA: { select: { name: true, email: true, phone: true } },
        userB: { select: { name: true, email: true, phone: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { reporter: { select: { name: true } }, target: { select: { name: true, email: true } } },
    }),
    prisma.moderationEvent.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { actor: { select: { name: true } } } }),
  ]);
  return (
    <div className="mx-auto max-w-4xl px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title="Message review" />
      <p className="mt-1 text-sm text-ink">
        Admin only. Members cannot open this queue. Contact details here are for moderation and verification. {reports.length} reports on this page.
      </p>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Reports</h2>
        {reports.length === 0 ? <p className="mt-3 text-sm text-mut">No reports.</p> : null}
        <ul className="mt-3 divide-y divide-line">
          {reports.map((report) => (
            <li key={report.id} className="py-3 text-sm">
              <b>{report.reporter.name}</b>
              <span className="text-mut"> reported </span>
              <b>{report.target.name}</b>
              <span className="text-mut"> · {report.target.email}</span>
              <p className="mt-1 text-ink">{report.reason}</p>
              <p className="text-xs text-mut">{formatAuditTime(report.createdAt)}</p>
              {report.conversationId ? (
                <Link href={`/admin/messages/${report.conversationId}`} className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-forest">
                  Open thread
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Threads</h2>
        <ul className="mt-3 divide-y divide-line">
          {conversations.map((conversation) => (
            <li key={conversation.id} className="py-3 text-sm">
              <Link href={`/admin/messages/${conversation.id}`} className="font-semibold">
                {conversation.userA.name} and {conversation.userB.name}
              </Link>
              <p className="text-xs text-mut">
                {conversation.userA.email}
                {conversation.userA.phone ? ` · ${conversation.userA.phone}` : ""} · {conversation.userB.email}
                {conversation.userB.phone ? ` · ${conversation.userB.phone}` : ""}
              </p>
              <p className="mt-1 text-ink">{conversation.messages[0]?.body ?? "No messages yet."}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Audit log</h2>
        <ul className="mt-3 divide-y divide-line">
          {events.map((event) => (
            <li key={event.id} className="py-2 text-sm text-ink">
              {event.summary}
              <span className="block text-xs text-mut">
                {event.actor?.name ?? "System"} · {moderationActionLabel(event.action)} · {formatAuditTime(event.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
