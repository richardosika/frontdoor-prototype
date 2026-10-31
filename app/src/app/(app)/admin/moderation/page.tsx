import Link from "next/link";
import { moderatePost, resolveReport } from "@/actions/admin";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
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
      where: { status: "OPEN" },
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
              {report.postId ? <span className="text-mut"> · post</span> : null}
              {report.conversationId ? <span className="text-mut"> · message</span> : null}
              <p className="mt-1 text-ink">{report.reason}</p>
              <p className="text-xs text-mut">{timeAgo(report.createdAt)}</p>
              <form action={resolveReport} className="mt-2">
                <input type="hidden" name="reportId" value={report.id} />
                <button className={btnOutline} type="submit">
                  Close report
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
