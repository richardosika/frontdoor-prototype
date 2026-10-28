import Link from "next/link";
import { moderatePost } from "@/actions/admin";
import { setReportStatus } from "@/actions/messaging-admin";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { REPORT_CATEGORY_LABELS, type ReportCategoryId } from "@/lib/platform/messaging-policy";
import { timeAgo } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [posts, reports] = await Promise.all([
    prisma.post.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: { author: true },
    }),
    prisma.report.findMany({
      where: { status: { in: ["OPEN", "REVIEWING"] } },
      orderBy: { createdAt: "asc" },
      include: { reporter: true, target: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title="Moderation" />
      <p className="mt-3 text-sm text-ink">Flagged posts and member reports wait here. A Private Floor administrator publishes or closes them. Members do not see scores or sources.</p>
      <div className="mt-3">
        <Banner error={params.error} notice={params.notice} />
      </div>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Flagged posts</h2>
        {posts.length === 0 ? <p className="mt-3 text-sm text-mut">None waiting.</p> : null}
        <ul className="mt-3 divide-y divide-line">
          {posts.map((post) => (
            <li key={post.id} className="py-3 text-sm">
              <b>{post.title || "Update"}</b>
              <span className="text-mut"> · {post.author.name}</span>
              {post.flagReason ? <p className="text-xs text-brass">Held because it mentioned {post.flagReason}.</p> : null}
              <p className="mt-1 text-ink">{post.body}</p>
              <p className="text-xs text-mut">{timeAgo(post.createdAt)}</p>
              <div className="mt-2 flex gap-2">
                <form action={moderatePost}>
                  <input type="hidden" name="postId" value={post.id} />
                  <button className={btnOutline} name="decision" value="REJECT" type="submit">
                    Do not publish
                  </button>
                </form>
                <form action={moderatePost}>
                  <input type="hidden" name="postId" value={post.id} />
                  <button className={btn} name="decision" value="PUBLISH" type="submit">
                    Publish
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Reports</h2>
        {reports.length === 0 ? <p className="mt-3 text-sm text-mut">None open.</p> : null}
        <ul className="mt-3 divide-y divide-line">
          {reports.map((report) => (
            <li key={report.id} className="py-3 text-sm">
              <b>{report.reporter.name}</b>
              <span className="text-mut"> reported </span>
              <Link href={`/admin/members/${report.targetUserId}`} className="underline decoration-brass">
                {report.target.name}
              </Link>
              <span className="text-mut"> · {REPORT_CATEGORY_LABELS[report.category as ReportCategoryId] || report.category}</span>
              <span className="text-mut"> · {report.status}</span>
              {report.postId ? <span className="text-mut"> · post</span> : null}
              {report.messageId ? <span className="text-mut"> · message</span> : null}
              {report.conversationId && !report.messageId ? <span className="text-mut"> · thread</span> : null}
              <p className="mt-1 text-ink">{report.reason}</p>
              <p className="text-xs text-mut">{timeAgo(report.createdAt)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["REVIEWING", "ACTIONED", "DISMISSED"] as const).map((status) => (
                  <form key={status} action={setReportStatus}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <button className={status === "ACTIONED" ? btn : btnOutline} name="status" value={status} type="submit">
                      {status === "REVIEWING" ? "Mark reviewing" : status === "ACTIONED" ? "Actioned" : "Dismiss"}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
