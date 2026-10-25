import type { ReactNode } from "react";
import Link from "next/link";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { GradeMark } from "@/components/grade-summary";
import { card, chipOff, chipOn } from "@/components/ui";
import { requireVerificationAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import {
  VERIFICATION_STATUSES,
  effectiveVerificationStatus,
  isAwaitingVerification,
  verificationQueueLabel,
  verificationStatusLabel,
} from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function VerificationQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; subject?: string; grade?: string; sort?: string }>;
}) {
  await requireVerificationAdmin();
  const params = await searchParams;
  const statusFilter = VERIFICATION_STATUSES.some((item) => item.id === params.status) ? params.status : undefined;
  const subject = params.subject === "MEMBER" || params.subject === "PROJECT" ? params.subject : undefined;
  const gradeFilter = ["A", "B", "C", "D", "F"].includes(params.grade || "") ? params.grade : "";
  const sort = params.sort === "grade" ? "grade" : "updated";
  const cases = await prisma.verificationCase.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { name: true, org: true, location: true } },
      project: { select: { name: true, location: true, year: true, user: { select: { name: true } } } },
    },
  });
  const userIds = cases.map((item) => item.userId).filter((id): id is string => Boolean(id));
  const applications = userIds.length
    ? await prisma.application.findMany({
        where: { userId: { in: userIds } },
        orderBy: { createdAt: "desc" },
        select: {
          userId: true,
          runs: {
            where: { subject: "APPLICATION", status: "DONE" },
            orderBy: { finishedAt: "desc" },
            take: 1,
            select: { gradeLetter: true, gradeScore: true, gradeConfidence: true, recommendation: true },
          },
        },
      })
    : [];
  const gradeByUser = new Map<string, { letter: string; score: number | null; confidence: string; recommendation: string }>();
  for (const application of applications) {
    if (!application.userId || gradeByUser.has(application.userId)) continue;
    const run = application.runs[0];
    if (!run?.gradeLetter) continue;
    gradeByUser.set(application.userId, {
      letter: run.gradeLetter,
      score: run.gradeScore,
      confidence: run.gradeConfidence,
      recommendation: run.recommendation,
    });
  }
  const awaiting = cases.filter((item) => isAwaitingVerification(item)).length;
  const gradeRank = (letter?: string) => ({ A: 5, B: 4, C: 3, D: 2, F: 1 })[letter || ""] || 0;
  const visible = cases
    .filter((item) => {
      const effective = effectiveVerificationStatus(item);
      if (subject && item.subject !== subject) return false;
      if (statusFilter && effective !== statusFilter) return false;
      if (gradeFilter && gradeByUser.get(item.userId || "")?.letter !== gradeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort !== "grade") return 0;
      return gradeRank(gradeByUser.get(b.userId || "")?.letter) - gradeRank(gradeByUser.get(a.userId || "")?.letter);
    });

  const labels = queueLabels(visible);

  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Verification" />
      <div className="mx-auto max-w-4xl px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title="Verification" />
      <p className="mt-1 text-sm text-ink">
        Verification files are the checklists for members and projects. The grade comes from the application file when one is linked. Members never see this queue, the grade, or the notes. {awaiting} awaiting review.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {["", "A", "B", "C", "D", "F"].map((letter) => (
          <Filter key={letter || "all"} href={queueHref({ subject, status: statusFilter, grade: letter, sort })} on={gradeFilter === letter}>
            {letter ? `Grade ${letter}` : "All grades"}
          </Filter>
        ))}
        <Filter href={queueHref({ subject, status: statusFilter, grade: gradeFilter, sort: "grade" })} on={sort === "grade"}>
          Sort by grade
        </Filter>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Filter href="/admin/verification" on={!subject && !statusFilter}>
          All
        </Filter>
        <Filter href={queueHref({ subject: "MEMBER", status: statusFilter })} on={subject === "MEMBER"}>
          Members
        </Filter>
        <Filter href={queueHref({ subject: "PROJECT", status: statusFilter })} on={subject === "PROJECT"}>
          Projects
        </Filter>
        {VERIFICATION_STATUSES.map((item) => (
          <Filter key={item.id} href={queueHref({ subject, status: item.id })} on={statusFilter === item.id}>
            {item.label}
          </Filter>
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {visible.length === 0 ? <li className="text-sm text-mut">Nothing in this view.</li> : null}
        {visible.map((item) => {
          const effective = effectiveVerificationStatus(item);
          return (
            <li key={item.id}>
              <Link href={`/admin/verification/${item.id}`} className={`${card} flex min-h-11 items-center justify-between gap-3 px-4 py-3`}>
                <span>
                  <b className="block text-sm">{labels.get(item.id)}</b>
                  <span className="text-xs text-mut">{item.subject === "MEMBER" ? "Member" : "Project"}</span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brass">{verificationStatusLabel(effective)}</span>
                  <GradeMark {...(gradeByUser.get(item.userId || "") || { letter: "" })} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      </div>
    </div>
  );
}

function queueLabels(items: (Parameters<typeof verificationQueueLabel>[0] & { id: string })[]) {
  const base = items.map((item) => verificationQueueLabel(item));
  const counts = new Map<string, number>();
  for (const label of base) counts.set(label, (counts.get(label) ?? 0) + 1);
  const labels = new Map<string, string>();
  items.forEach((item, index) => {
    const label = base[index] ?? "Case";
    labels.set(item.id, (counts.get(label) ?? 0) > 1 ? `${label} · ${item.id.slice(-4)}` : label);
  });
  return labels;
}

function queueHref(input: { subject?: string; status?: string; grade?: string; sort?: string }) {
  const params = new URLSearchParams();
  if (input.subject) params.set("subject", input.subject);
  if (input.status) params.set("status", input.status);
  if (input.grade) params.set("grade", input.grade);
  if (input.sort === "grade") params.set("sort", "grade");
  const value = params.toString();
  return value ? `/admin/verification?${value}` : "/admin/verification";
}

function Filter({ href, on, children }: { href: string; on: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={on ? chipOn : chipOff}>
      {children}
    </Link>
  );
}
