import { MobileTitle, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { noticeTestRecipient } from "@/lib/brand";
import { requireAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { noticeHtml } from "@/lib/resend-mail";
import { reviewNotice, reviewTemplateKey } from "@/lib/review-copy";

export const dynamic = "force-dynamic";

export default async function OutboxPage() {
  await requireAdmin();
  const notices = await prisma.outboxNotice.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Outbox" />
      <div className="mx-auto min-w-0 max-w-3xl overflow-x-hidden px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Outbox" />
        <p className="mt-3 text-sm text-ink">
          Every notice on this test is stored here. When Resend is configured, a copy is emailed only to {noticeTestRecipient()}. Applicants are not emailed. A failed send is marked on the notice.
        </p>
        {notices.length === 0 ? <p className="mt-6 text-sm text-mut">No notices yet.</p> : null}
        <ul className="mt-4 space-y-3">
          {notices.map((notice) => {
            const subject = reviewNotice(notice.subject);
            const body = reviewNotice(notice.body);
            const templateKey = reviewTemplateKey(notice.templateKey);
            return (
            <li key={notice.id} className={`${card} min-w-0 overflow-hidden p-4 text-sm`}>
              <p className="text-xs text-mut">{formatAuditTime(notice.createdAt)}</p>
              <p>
                <b>{subject}</b>
              </p>
              <p className="text-xs text-ink">
                Intended: {notice.intendedTo} · Delivered only to: {notice.deliveredTo}
                {templateKey ? ` · ${templateKey}` : ""}
                {notice.suppressed ? ` · Not sent: ${notice.suppressedReason}` : ""}
                {notice.sendStatus === "sent" ? " · Emailed to the test recipient" : ""}
                {notice.sendStatus === "failed" ? ` · Email failed: ${notice.sendError}` : ""}
              </p>
              <iframe
                title={`Email preview: ${subject}`}
                sandbox=""
                srcDoc={noticeHtml(body, { headline: subject })}
                className="mt-3 h-[520px] w-full rounded border border-line bg-cream"
              />
              <pre className="mt-2 whitespace-pre-wrap break-all font-sans text-sm text-ink">{body}</pre>
            </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
