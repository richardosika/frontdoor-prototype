import Link from "next/link";
import { reviewProject } from "@/actions/projects";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, card, field } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { timeAgo } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { parseSeeking, reviewLabel, seekLabel } from "@/lib/project-contact";

export const dynamic = "force-dynamic";

export default async function ProjectReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [queue, recent] = await Promise.all([
    prisma.trackProject.findMany({
      where: { reviewStatus: "PENDING_REVIEW" },
      orderBy: { submittedAt: "asc" },
      include: {
        user: { select: { id: true, name: true, org: true, role: true } },
        documents: { select: { id: true, title: true, fileName: true, contentType: true, sizeBytes: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.trackProject.findMany({
      where: { reviewStatus: { in: ["NEEDS_INFO", "DECLINED"] } },
      orderBy: { reviewedAt: "desc" },
      take: 20,
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title="Project review" />
      <p className="mt-3 text-[15px] text-ink">
        Projects members submit wait here. Other members do not see a project until it is approved. Each decision emails the member in their saved language.
      </p>
      <div className="mt-3">
        <Banner error={params.error} notice={params.notice} />
      </div>
      <section className={`${card} mt-4 p-4`} data-testid="project-queue">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brass">Pending review ({queue.length})</h2>
        {queue.length === 0 ? <p className="mt-2 text-[15px] text-mut">Nothing waiting.</p> : null}
        <ul>
          {queue.map((project) => (
            <li key={project.id} className="border-b border-line py-4 last:border-0">
              <p className="text-[17px] font-semibold">{project.name}</p>
              <p className="text-[15px] text-mut">
                <Link href={`/admin/members/${project.user.id}`} className="underline">
                  {project.user.name}
                </Link>{" "}
                · {project.user.org} · submitted {timeAgo(project.submittedAt)}
              </p>
              <dl className="mt-2 grid gap-1 text-[15px] text-ink sm:grid-cols-2">
                <div>Asset class: {project.asset}</div>
                <div>Role: {project.role || "—"}</div>
                <div>Address: {[project.street, project.location].filter(Boolean).join(", ")}</div>
                <div>Year completed / expected: {project.year}</div>
                <div>Total project value: {project.valueLabel}</div>
                <div>Share with circle: {project.shareWithCircle ? "Yes" : "No"}</div>
                <div className="sm:col-span-2">Seeking: {parseSeeking(project.seeking).map(seekLabel).join(", ") || "Nothing"}</div>
                {project.summary ? <div className="sm:col-span-2">Notes: {project.summary}</div> : null}
                {project.reviewNote ? <div className="sm:col-span-2 text-mut">Earlier note: {project.reviewNote}</div> : null}
              </dl>
              <div className="mt-3" data-testid="admin-project-files">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-mut">Documents &amp; photos ({project.documents.length})</p>
                {project.documents.length === 0 ? <p className="text-[15px] text-mut">No files attached.</p> : null}
                <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {project.documents.map((doc) => (
                    <li key={doc.id} className="overflow-hidden rounded border border-line bg-paper">
                      <a href={`/api/project-documents/${doc.id}`} target="_blank" rel="noreferrer" className="block">
                        {doc.contentType.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/api/project-documents/${doc.id}`} alt={doc.title} className="block aspect-[4/3] w-full object-cover" />
                        ) : (
                          <span className="flex aspect-[4/3] items-center justify-center bg-cream text-[20px] font-semibold text-forest">PDF</span>
                        )}
                        <span className="block px-2 py-1 text-[14px] text-ink underline decoration-brass">{doc.title}</span>
                        <span className="block px-2 pb-1 text-[12px] text-mut">{doc.fileName} · {Math.max(1, Math.round(doc.sizeBytes / 1024))} KB</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <form action={reviewProject} className="mt-3 grid gap-2">
                <input type="hidden" name="projectId" value={project.id} />
                <textarea
                  name="note"
                  rows={2}
                  className={`${field} text-[15px]`}
                  placeholder="Note to the member. Required for More info needed, optional reason for Decline."
                />
                <div className="flex flex-wrap gap-2">
                  <button className={btn} name="decision" value="APPROVE" type="submit">
                    Approve
                  </button>
                  <button className={btnOutline} name="decision" value="NEEDS_INFO" type="submit">
                    More info needed
                  </button>
                  <button className={btnOutline} name="decision" value="DECLINE" type="submit">
                    Decline
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      </section>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brass">Sent back or declined</h2>
        {recent.length === 0 ? <p className="mt-2 text-[15px] text-mut">None.</p> : null}
        <ul>
          {recent.map((project) => (
            <li key={project.id} className="border-b border-line py-2 text-[15px] last:border-0">
              <b>{project.name}</b> · {project.user.name} · {reviewLabel(project.reviewStatus)}
              {project.reviewNote ? <span className="text-mut"> · {project.reviewNote}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
