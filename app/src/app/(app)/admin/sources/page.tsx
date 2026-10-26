import { refreshWatchlists } from "@/actions/owner";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { RunAndReload } from "@/components/run-and-reload";
import { btn, card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { reviewCopy } from "@/lib/review-copy";
import { VERIFICATION_SOURCES } from "@/lib/verify/sources";

export const dynamic = "force-dynamic";

export default async function VerificationSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const cache = await prisma.sourceCache.findUnique({ where: { key: "ofac-sdn" } });
  let names = 0;
  if (cache) {
    try {
      const parsed = JSON.parse(cache.body) as unknown[];
      names = Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      names = 0;
    }
  }
  const recent = await prisma.verificationRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, subject: true, status: true, verdict: true, companyName: true, createdAt: true },
  });
  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Verification" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Sources and watchlists" />
        <div className="mt-3">
          <Banner error={params.error} notice={params.notice} />
        </div>
        <section className={`${card} mt-4 p-4 text-sm`}>
          <p>
            Verification settings. OFAC SDN cache: {cache ? `${names} names, refreshed ${formatAuditTime(cache.fetchedAt)}` : "not downloaded yet"}. A local test name, Alexei Sanctionhit, is always included so the sample hit still works if the download fails.
          </p>
          <div className="mt-3">
            <RunAndReload className={btn} label="Refresh watchlists now" pendingLabel="Refreshing watchlists…" run={refreshWatchlists} />
          </div>
        </section>
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Sources</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {VERIFICATION_SOURCES.map((source) => (
              <li key={source.name} className="py-2">
                <b>{reviewCopy(source.name)}</b>
                <span className="block text-xs text-mut">{source.kind}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Recent runs</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {recent.map((run) => (
              <li key={run.id} className="py-2">
                {formatAuditTime(run.createdAt)} · {run.subject} · {run.status}
                {run.verdict ? ` · ${run.verdict}` : ""} · {run.companyName || "—"}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
