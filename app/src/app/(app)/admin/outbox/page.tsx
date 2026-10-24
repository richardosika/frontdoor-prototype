import { AdminNav } from "@/components/admin-nav";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { noticeTestRecipient } from "@/lib/brand";
import { requireAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OutboxPage() {
  await requireAdmin();
  const notices = await prisma.outboxNotice.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Outbox" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Outbox" />
        <AdminNav current="/admin/outbox" />
        <p className="mt-3 text-sm text-ink">
          Every notice on this test is stored here and addressed only to {noticeTestRecipient()}. Applicants are not emailed.
        </p>
        {notices.length === 0 ? <p className="mt-6 text-sm text-mut">No notices yet.</p> : null}
        <ul className="mt-4 space-y-3">
          {notices.map((notice) => (
            <li key={notice.id} className={`${card} p-4 text-sm`}>
              <p className="text-xs text-mut">{formatAuditTime(notice.createdAt)}</p>
              <p>
                <b>{notice.subject}</b>
              </p>
              <p className="text-xs text-ink">
                Intended: {notice.intendedTo} · Delivered only to: {notice.deliveredTo}
              </p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-ink">{notice.body}</pre>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
