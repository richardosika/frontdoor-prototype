import Link from "next/link";
import { deleteSelectedApplications, rerunVerification } from "@/actions/owner";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { ConfirmSubmitButton, RunAndReload } from "@/components/run-and-reload";
import { GradeMark } from "@/components/grade-summary";
import { DemoChip, StatusChip } from "@/components/status-chip";
import { btnOutline, card } from "@/components/ui";
import { applicantQueue, standingForInvite } from "@/lib/applicant-queue";
import {
  APPLICATION_FILTERS,
  type ApplicationFilter,
  applicationStatusLabel,
} from "@/lib/application-status";
import { syncCrm } from "@/lib/crm";
import { requireAdmin } from "@/lib/current-user";
import { ADMIN_INTROS } from "@/lib/membership-copy";
import { isDemoRecord, personStageLabel, personStanding } from "@/lib/person-standing";
import { formatAuditTime, formatEtDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { settleStuckRuns } from "@/lib/verify/queue";
import { paymentStatusLabel } from "@/lib/payments";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; filter?: string; sort?: string; grade?: string; demo?: string }>;
}) {
  await requireAdmin();
  await settleStuckRuns();
  const params = await searchParams;
  const filter = APPLICATION_FILTERS.some((item) => item.id === params.filter) ? (params.filter as ApplicationFilter) : "action";
  const sort = params.sort === "score" || params.sort === "grade" ? params.sort : "submitted";
  const gradeFilter = ["A", "B", "C", "D", "F"].includes(params.grade || "") ? params.grade : "";
  const hideDemo = params.demo === "hide";
  const demoQuery = hideDemo ? "&demo=hide" : "";
  await syncCrm();
  const members = await prisma.user.findMany({ select: { email: true, status: true, paymentStatus: true, isAdmin: true } });
  const memberByEmail = new Map(members.map((member) => [member.email.toLowerCase(), member]));
  const [applications, invites] = await Promise.all([
    prisma.application.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        runs: { where: { subject: "APPLICATION" }, orderBy: { createdAt: "desc" }, take: 1 },
        user: { select: { status: true, paymentStatus: true, renewalAt: true, isAdmin: true } },
      },
    }),
    prisma.inviteRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { crmPeople: { select: { id: true }, take: 1 } },
    }),
  ]);
  const gradeRank = (letter?: string | null) => ({ A: 5, B: 4, C: 3, D: 2, F: 1 })[letter || ""] || 0;
  const applicationById = new Map(applications.map((application) => [application.id, application]));
  const inviteById = new Map(invites.map((invite) => [invite.id, invite]));
  const gradeApplications = applications.filter((application) => !gradeFilter || application.runs[0]?.gradeLetter === gradeFilter);
  const queued = applicantQueue(
    filter,
    hideDemo,
    gradeApplications.map((application) => ({
      id: application.id,
      email: application.email,
      status: application.status,
      isTest: application.isTest,
      createdAt: application.createdAt.getTime(),
      verdict: application.runs[0]?.verdict,
    })),
    gradeFilter
      ? []
      : invites.map((invite) => ({
          id: invite.id,
          email: invite.email,
          status: invite.status,
          createdAt: invite.createdAt.getTime(),
        })),
  );
  const rows = [...queued].sort((a, b) => {
    if (sort !== "grade" && sort !== "score") return 0;
    const left = a.kind === "application" ? applicationById.get(a.id) : undefined;
    const right = b.kind === "application" ? applicationById.get(b.id) : undefined;
    if (sort === "grade") return gradeRank(right?.runs[0]?.gradeLetter) - gradeRank(left?.runs[0]?.gradeLetter);
    return (right?.runs[0]?.gradeScore ?? right?.runs[0]?.score ?? -1) - (left?.runs[0]?.gradeScore ?? left?.runs[0]?.score ?? -1);
  });

  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Applications" />
      <div className="mx-auto min-w-0 max-w-5xl overflow-x-hidden px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Applications" />
        <p className="mt-3 text-sm text-ink">{ADMIN_INTROS.applications} The grade is a recommendation. Richard Osika approves every member.</p>
        <div className="mt-3">
          <Banner error={params.error} notice={params.notice} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {APPLICATION_FILTERS.map((item) => (
            <Link
              key={item.id}
              href={`/admin/applications?filter=${item.id}&sort=${sort}${gradeFilter ? `&grade=${gradeFilter}` : ""}${demoQuery}`}
              className={`inline-flex min-h-11 items-center rounded-sm border px-3 text-xs ${
                filter === item.id ? "border-brass bg-forest text-paper" : "border-line bg-paper"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["", "A", "B", "C", "D", "F"].map((letter) => (
            <Link
              key={letter || "all"}
              href={`/admin/applications?filter=${filter}&sort=${sort}${letter ? `&grade=${letter}` : ""}${demoQuery}`}
              className={`inline-flex min-h-11 items-center rounded-sm border px-3 text-xs ${
                gradeFilter === letter ? "border-brass bg-forest text-paper" : "border-line bg-paper"
              }`}
            >
              {letter ? `Grade ${letter}` : "All grades"}
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href={`/admin/applications?filter=${filter}&sort=submitted${gradeFilter ? `&grade=${gradeFilter}` : ""}${demoQuery}`} className={sort === "submitted" ? "font-semibold text-brass" : ""}>
            Sort by submitted
          </Link>
          <Link href={`/admin/applications?filter=${filter}&sort=grade${gradeFilter ? `&grade=${gradeFilter}` : ""}${demoQuery}`} className={sort === "grade" ? "font-semibold text-brass" : ""}>
            Sort by grade
          </Link>
          <Link href={`/admin/applications?filter=${filter}&sort=score${gradeFilter ? `&grade=${gradeFilter}` : ""}${demoQuery}`} className={sort === "score" ? "font-semibold text-brass" : ""}>
            Sort by score
          </Link>
          <Link href={hideDemo ? `/admin/applications?filter=${filter}&sort=${sort}${gradeFilter ? `&grade=${gradeFilter}` : ""}` : `/admin/applications?filter=${filter}&sort=${sort}${gradeFilter ? `&grade=${gradeFilter}` : ""}&demo=hide`} className="underline decoration-brass">
            {hideDemo ? "Show demo" : "Hide demo"}
          </Link>
        </div>
        <form id="bulk-delete" action={deleteSelectedApplications} />
        <div className="mt-4">
          <ConfirmSubmitButton
            form="bulk-delete"
            className={btnOutline}
            message="Delete the selected applicants? This removes each application, its verification runs, outbox notices, and business card, plus the linked member account and CRM person when they exist. This cannot be undone."
          >
            Delete selected
          </ConfirmSubmitButton>
        </div>
        {rows.length === 0 ? <p className="mt-6 text-sm text-mut">Nothing in this filter.</p> : null}
        <ul className="mt-4 space-y-3">
          {rows.map((row) => {
            if (row.kind === "invite") {
              const invite = inviteById.get(row.id);
              if (!invite) return null;
              const standing = standingForInvite(invite.status);
              const personId = invite.crmPeople[0]?.id;
              return (
                <li key={invite.id}>
                  <Link href={personId ? `/admin/crm/${personId}` : "/admin"} className={`${card} block p-4`}>
                    <h2 className="font-serif text-xl font-normal">{invite.name}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusChip status={standing.status} />
                      {isDemoRecord({ email: invite.email }) ? <DemoChip /> : null}
                    </div>
                    <p className="text-sm text-ink">
                      {invite.org} · {roleLabel(invite.role)} · {invite.location}
                    </p>
                    <p className="text-xs text-mut">
                      {formatAuditTime(invite.createdAt)} · {personStageLabel(standing.stage)}
                    </p>
                  </Link>
                </li>
              );
            }
            const application = applicationById.get(row.id);
            if (!application) return null;
            const member = application.user || memberByEmail.get(application.email.toLowerCase());
            const standing = personStanding({
              applicationStatus: application.status,
              accountStatus: member?.status,
              paymentStatus: member?.paymentStatus,
              hasMember: Boolean(member),
              isAdmin: member?.isAdmin,
            });
            return (
            <li key={application.id} className="flex items-start gap-2">
              <input form="bulk-delete" className="mt-5 h-4 w-4 shrink-0" type="checkbox" name="applicationId" value={application.id} aria-label={`Select ${application.name}`} />
              <div className="min-w-0 flex-1">
              <Link href={`/admin/applications/${application.id}`} className={`${card} block p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-xl font-normal">{application.name}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusChip status={standing.status} />
                      {isDemoRecord({ isTest: application.isTest, email: application.email }) ? <DemoChip /> : null}
                    </div>
                    <p className="text-sm text-ink">
                      {application.org} · {roleLabel(application.role)} · {application.location}
                    </p>
                    <p className="text-xs text-mut">
                      {formatAuditTime(application.createdAt)} · {personStageLabel(standing.stage)} · {applicationStatusLabel(application.status)}
                      {application.user ? ` · ${paymentStatusLabel(application.user.paymentStatus)}` : ""}
                      {application.user?.renewalAt ? ` · renews ${formatEtDate(application.user.renewalAt)}` : ""}
                    </p>
                  </div>
                  <GradeMark
                    letter={application.runs[0]?.gradeLetter}
                    score={application.runs[0]?.gradeScore}
                    recommendation={application.runs[0]?.recommendation}
                    confidence={application.runs[0]?.gradeConfidence}
                  />
                </div>
              </Link>
              {!application.runs[0] || application.runs[0].status !== "DONE" ? (
                <div className="mt-2">
                  <RunAndReload
                    className={btnOutline}
                    label={application.runs[0] ? "Re-run verification" : "Run verification"}
                    pendingLabel="Running verification…"
                    run={rerunVerification.bind(null, application.id)}
                  />
                </div>
              ) : null}
              </div>
            </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
