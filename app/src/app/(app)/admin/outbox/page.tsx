import { deleteOutboxNotice } from "@/actions/admin";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { ConfirmSubmitButton } from "@/components/run-and-reload";
import { btnOutline, card } from "@/components/ui";
import { noticeTestRecipient } from "@/lib/brand";
import { requireAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { noticeHtml } from "@/lib/resend-mail";
import { reviewNotice, reviewTemplateKey } from "@/lib/review-copy";

export const dynamic = "force-dynamic";

export default async function OutboxPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const notices = await prisma.outboxNotice.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Outbox" />
      <div className="mx-auto min-w-0 max-w-3xl overflow-x-hidden px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Outbox" />
        <div className="mt-3">
          <Banner error={query.error} notice={query.notice} />
        </div>
        <p className="mt-3 text-sm text-ink">
          Every notice on this test is stored here. When Resend is configured, a copy is emailed only to {noticeTestRecipient()}. Applicants are not emailed. A failed send is marked on the notice. Delete removes that one notice, including a code left behind when someone leaves after Send code.
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
              <form id={`delete-notice-${notice.id}`} action={deleteOutboxNotice} className="mt-3">
                <input type="hidden" name="noticeId" value={notice.id} />
                <ConfirmSubmitButton
                  form={`delete-notice-${notice.id}`}
                  className={btnOutline}
                  message={`Delete this Outbox notice to ${notice.intendedTo}? The row is removed. This cannot be undone.`}
                >
                  Delete notice
                </ConfirmSubmitButton>
              </form>
            </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
