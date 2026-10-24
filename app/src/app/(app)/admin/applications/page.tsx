import Link from "next/link";
import { deleteSelectedApplications } from "@/actions/owner";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { ConfirmSubmitButton } from "@/components/run-and-reload";
import { VerdictChip } from "@/components/verdict-chip";
import { btnOutline, card } from "@/components/ui";
import {
  APPLICATION_FILTERS,
  type ApplicationFilter,
  applicationStatusLabel,
  matchesApplicationFilter,
} from "@/lib/application-status";
import { requireAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { paymentStatusLabel } from "@/lib/payments";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; filter?: string; sort?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const filter = APPLICATION_FILTERS.some((item) => item.id === params.filter) ? (params.filter as ApplicationFilter) : "action";
  const sort = params.sort === "score" ? "score" : "submitted";
  const applications = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      runs: { where: { subject: "APPLICATION" }, orderBy: { createdAt: "desc" }, take: 1 },
      user: { select: { paymentStatus: true, renewalAt: true } },
    },
  });
  const rows = applications
    .filter((application) => matchesApplicationFilter(filter, application.status, application.runs[0]?.verdict))
    .sort((a, b) => {
      if (sort === "score") return (b.runs[0]?.score ?? -1) - (a.runs[0]?.score ?? -1);
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Applications" />
      <div className="mx-auto min-w-0 max-w-5xl overflow-x-hidden px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Applications" />
        <p className="mt-3 text-sm text-ink">Recommendations only. Richard Osika approves every member.</p>
        <div className="mt-3">
          <Banner error={params.error} notice={params.notice} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {APPLICATION_FILTERS.map((item) => (
            <Link
              key={item.id}
              href={`/admin/applications?filter=${item.id}&sort=${sort}`}
              className={`inline-flex min-h-11 items-center rounded-sm border px-3 text-xs ${
                filter === item.id ? "border-brass bg-forest text-paper" : "border-line bg-paper"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="mt-3 flex gap-3 text-sm">
          <Link href={`/admin/applications?filter=${filter}&sort=submitted`} className={sort === "submitted" ? "font-semibold text-brass" : ""}>
            Sort by submitted
          </Link>
          <Link href={`/admin/applications?filter=${filter}&sort=score`} className={sort === "score" ? "font-semibold text-brass" : ""}>
            Sort by score
          </Link>
        </div>
        <form id="bulk-delete" action={deleteSelectedApplications} />
        <div className="mt-4">
          <ConfirmSubmitButton
            form="bulk-delete"
            className={btnOutline}
            message="Delete the selected applicants and all of their data? This cannot be undone."
          >
            Delete selected
          </ConfirmSubmitButton>
        </div>
        {rows.length === 0 ? <p className="mt-6 text-sm text-mut">Nothing in this filter.</p> : null}
        <ul className="mt-4 space-y-3">
          {rows.map((application) => (
            <li key={application.id} className="flex items-start gap-2">
              <input form="bulk-delete" className="mt-5 h-4 w-4 shrink-0" type="checkbox" name="applicationId" value={application.id} aria-label={`Select ${application.name}`} />
              <Link href={`/admin/applications/${application.id}`} className={`${card} block min-w-0 flex-1 p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-xl font-normal">{application.name}</h2>
                    <p className="text-sm text-ink">
                      {application.org} · {roleLabel(application.role)} · {application.location}
                    </p>
                    <p className="text-xs text-mut">
                      {formatAuditTime(application.createdAt)} · {applicationStatusLabel(application.status)}
                      {application.user ? ` · ${paymentStatusLabel(application.user.paymentStatus)}` : ""}
                      {application.user?.renewalAt ? ` · renews ${application.user.renewalAt.toISOString().slice(0, 10)}` : ""}
                      {application.isTest ? " · TEST" : ""}
                    </p>
                  </div>
                  <VerdictChip verdict={application.runs[0]?.verdict} score={application.runs[0]?.score} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
