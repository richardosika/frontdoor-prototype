import { MobileTitle, PageHeader } from "@/components/page-header";
import { card, field } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { verdictLabel } from "@/lib/application-status";
import { prisma } from "@/lib/prisma";
import { auditRunScore } from "@/lib/rerun-audit";
import { auditMatches } from "@/lib/platform/admin-taxonomy";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; targetType?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const query = { q: params.q || "", targetType: params.targetType || "" };
  const [decisions, moderation, runs] = await Promise.all([
    prisma.applicationDecision.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { actor: { select: { name: true } }, application: { select: { name: true } } },
    }),
    prisma.moderationEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: query.q || query.targetType ? 200 : 40,
      include: { actor: { select: { name: true } } },
    }),
    prisma.verificationRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        subject: true,
        status: true,
        verdict: true,
        score: true,
        gradeLetter: true,
        gradeScore: true,
        companyName: true,
        createdAt: true,
        application: { select: { name: true } },
      },
    }),
  ]);
  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Audit" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Audit log" />
        <p className="mt-2 text-sm text-ink">Search moderation, licence, showcase, and directory setup events. Verification grades on this page stay with the administrator.</p>
        <form className="mt-3 flex flex-wrap gap-2">
          <input name="q" defaultValue={query.q} placeholder="Search the log" className={field} />
          <select name="targetType" defaultValue={query.targetType} className={field}>
            <option value="">Every type</option>
            <option value="asset">Asset type</option>
            <option value="field">Field</option>
            <option value="market">Market</option>
            <option value="specialty">Specialty</option>
            <option value="licence">Licence</option>
            <option value="showcase">Showcase</option>
            <option value="deal">Deal team</option>
            <option value="settings">Settings</option>
            <option value="member">Member</option>
          </select>
          <button className="min-h-11 rounded-sm bg-forest px-4 text-sm font-semibold text-paper" type="submit">
            Search
          </button>
        </form>
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
            {runs.map((row) => {
              const points = auditRunScore(row);
              const grade = row.gradeLetter && typeof points === "number" ? `Grade ${row.gradeLetter} (${points})` : typeof points === "number" ? String(points) : "";
              return (
              <li key={row.id} className="py-2">
                {formatAuditTime(row.createdAt)} · {row.subject} · {row.status}
                {row.verdict ? ` · ${verdictLabel(row.verdict)}` : ""}
                {grade ? ` · ${grade}` : ""} · {row.application?.name || row.companyName || "No application"}
              </li>
              );
            })}
          </ul>
        </section>
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Moderation</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {moderation
              .filter((row) =>
                auditMatches(
                  { summary: row.summary, action: row.action, targetType: row.targetType, targetUserId: row.targetUserId || "" },
                  query,
                ),
              )
              .map((row) => (
              <li key={row.id} className="py-2">
                {formatAuditTime(row.createdAt)} · {row.actor?.name || "Private Floor"}
                {row.targetType ? ` · ${row.targetType}` : ""} · {row.summary}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
