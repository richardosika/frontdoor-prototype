import { reviewLicence } from "@/actions/vendor-admin";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { LICENSE_KIND_LABELS } from "@/lib/platform/showcase";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminLicencesPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const now = new Date();
  const rows = await prisma.license.findMany({
    where: {
      OR: [{ status: { in: ["SELF_REPORTED", "UNDER_REVIEW"] } }, { status: "VERIFIED", recheckOn: { lte: now } }],
    },
    orderBy: { id: "asc" },
    include: { user: { select: { name: true, org: true } } },
    take: 100,
  });
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageHeader title="Licences" />
      <p className="mt-2 text-sm text-ink">Check the public record, then mark the row. The number stays on this page. Members never see a grade.</p>
      <Banner error={params.error} notice={params.notice} />
      <ul className="mt-4 divide-y divide-line">
        {rows.map((row) => (
          <li key={row.id} className="py-3 text-sm">
            <b>{row.user.name}</b>
            <span className="text-mut"> · {row.user.org}</span>
            <p className="mt-1">
              {row.stateCode} · {LICENSE_KIND_LABELS[row.kind] || row.kind} · {row.status}
              {row.scope ? ` · ${row.scope}` : ""}
            </p>
            <p className="text-xs text-mut">Number {row.number || "—"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["VERIFIED", "NOT_FOUND", "REJECTED"] as const).map((decision) => (
                <form key={decision} action={reviewLicence}>
                  <input type="hidden" name="licenceId" value={row.id} />
                  <button className={decision === "VERIFIED" ? btn : btnOutline} name="decision" value={decision} type="submit">
                    {decision === "VERIFIED" ? "Mark verified" : decision === "NOT_FOUND" ? "Not found" : "Reject"}
                  </button>
                </form>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="mt-4 text-sm text-mut">None waiting.</p> : null}
    </div>
  );
}
