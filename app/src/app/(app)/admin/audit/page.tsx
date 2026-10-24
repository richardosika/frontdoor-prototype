import { AdminNav } from "@/components/admin-nav";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireAdmin();
  const [decisions, moderation, runs] = await Promise.all([
    prisma.applicationDecision.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { actor: { select: { name: true } }, application: { select: { name: true } } },
    }),
    prisma.moderationEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { name: true } } },
    }),
    prisma.verificationRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, subject: true, status: true, verdict: true, score: true, createdAt: true, application: { select: { name: true } } },
    }),
  ]);
  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Audit" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Audit log" />
        <AdminNav current="/admin/audit" />
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Application decisions</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {decisions.map((row) => (
              <li key={row.id} className="py-2">
                {formatAuditTime(row.createdAt)} · {row.actor?.name || "Private Floor"} · {row.decision} · {row.application.name}
                {row.reason ? <span className="block text-ink">{row.reason}</span> : null}
              </li>
            ))}
          </ul>
        </section>
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Verification runs</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {runs.map((row) => (
              <li key={row.id} className="py-2">
                {formatAuditTime(row.createdAt)} · {row.subject} · {row.status}
                {row.verdict ? ` · ${row.verdict}` : ""}
                {typeof row.score === "number" ? ` · ${row.score}` : ""} · {row.application?.name || "No application"}
              </li>
            ))}
          </ul>
        </section>
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Moderation</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {moderation.map((row) => (
              <li key={row.id} className="py-2">
                {formatAuditTime(row.createdAt)} · {row.actor?.name || "Private Floor"} · {row.summary}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
