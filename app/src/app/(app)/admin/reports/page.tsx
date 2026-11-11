import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";
import { resolveReport } from "@/actions/admin";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btnOutline, card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const h2 = "text-[11px] font-semibold uppercase tracking-[0.16em] text-brass";
const when = (d: Date) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(d) + " ET";

/** Nov 5: one place to track member reports (messages, profiles, posts) and blocks with the reason given. */
export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const [open, closed, blocks] = await Promise.all([
    prisma.report.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, include: { reporter: { select: { id: true, name: true } }, target: { select: { id: true, name: true } } }, take: 200 }),
    prisma.report.findMany({ where: { status: { not: "OPEN" } }, orderBy: { createdAt: "desc" }, include: { reporter: { select: { id: true, name: true } }, target: { select: { id: true, name: true } } }, take: 100 }),
    prisma.block.findMany({ orderBy: { createdAt: "desc" }, include: { blocker: { select: { id: true, name: true } }, blocked: { select: { id: true, name: true } } }, take: 200 }),
  ]);
  const kind = (r: { postId: string; conversationId: string }) => (r.postId ? "Post" : r.conversationId ? "Message" : "Profile");
  const row = (r: (typeof open)[number], openRow: boolean) => (
    <li key={r.id} className="py-3 text-sm" data-testid="admin-report-row">
      <p>
        <Link href={`/admin/members/${r.reporterId}`} className="font-semibold underline decoration-brass">{r.reporter.name}</Link>
        <span className="text-mut"> reported </span>
        <Link href={`/admin/members/${r.targetUserId}`} className="font-semibold underline decoration-brass">{r.target.name}</Link>
        <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-[12px] text-mut">{kind(r)}</span>
      </p>
      <p className="mt-1 whitespace-pre-line text-ink [overflow-wrap:anywhere]">{r.reason}</p>
      <p className="text-xs text-mut">
        {when(r.createdAt)}
        {r.conversationId ? <> · <Link href={`/admin/messages/${r.conversationId}`} className="underline">Open the conversation</Link></> : null}
      </p>
      {openRow ? (
        <form action={resolveReport} className="mt-2">
          <input type="hidden" name="reportId" value={r.id} />
          <input type="hidden" name="back" value="/admin/reports" />
          <SubmitButton className={btnOutline} pendingLabel="Closing…">Close report</SubmitButton>
        </form>
      ) : (
        <p className="text-xs text-mut">Closed</p>
      )}
    </li>
  );
  return (
    <div className="mx-auto max-w-4xl px-4 pb-6 pt-3 md:pt-6 lg:px-8" data-testid="admin-reports">
      <PageHeader title="Reports" />
      <p className="mt-3 text-sm text-ink">Every report a member sends from Messages or a profile, and every block with the reason the member gave. Members are never told who reported or blocked them.</p>
      <div className="mt-3">
        <Banner error={params.error} notice={params.notice} />
      </div>
      <section className={`${card} mt-4 p-4`}>
        <h2 className={h2}>Open reports ({open.length})</h2>
        {open.length === 0 ? <p className="mt-3 text-sm text-mut">None open.</p> : null}
        <ul className="mt-2 divide-y divide-line">{open.map((r) => row(r, true))}</ul>
      </section>
      <section className={`${card} mt-4 p-4`} data-testid="admin-blocks">
        <h2 className={h2}>Blocks and reasons ({blocks.length})</h2>
        {blocks.length === 0 ? <p className="mt-3 text-sm text-mut">No blocks.</p> : null}
        <ul className="mt-2 divide-y divide-line">
          {blocks.map((b) => (
            <li key={b.id} className="py-3 text-sm" data-testid="admin-block-row">
              <p>
                <Link href={`/admin/members/${b.blockerId}`} className="font-semibold underline decoration-brass">{b.blocker.name}</Link>
                <span className="text-mut"> blocked </span>
                <Link href={`/admin/members/${b.blockedId}`} className="font-semibold underline decoration-brass">{b.blocked.name}</Link>
              </p>
              <p className="mt-1 whitespace-pre-line text-ink [overflow-wrap:anywhere]">{b.reason || <span className="italic text-mut">No reason recorded (blocked before reasons were asked).</span>}</p>
              <p className="text-xs text-mut">{when(b.createdAt)}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className={`${card} mt-4 p-4`}>
        <h2 className={h2}>Closed reports</h2>
        {closed.length === 0 ? <p className="mt-3 text-sm text-mut">None yet.</p> : null}
        <ul className="mt-2 divide-y divide-line">{closed.map((r) => row(r, false))}</ul>
      </section>
    </div>
  );
}
