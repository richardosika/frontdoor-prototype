import { currentLocale, serverTx } from "@/lib/i18n/server";
import { EQUITY_CAUTION, allFacts, factsFor } from "@/lib/project-facts";

/** The project details that matter to the viewer's member type, as a compact fact grid. */
export async function ProjectFacts({
  category,
  project,
  all = false,
  valueVisible = true,
  compact = false,
}: {
  category: string | null;
  project: { roleFacts?: string | null; valueLabel: string };
  all?: boolean;
  valueVisible?: boolean;
  compact?: boolean;
}) {
  const tx = await serverTx();
  const locale = await currentLocale();
  const facts = all ? allFacts(project, locale) : factsFor(category, project, locale, { valueVisible });
  if (facts.length === 0) return null;
  const equity = facts.some((fact) => fact.key === "equityRaise");
  return (
    <div className={compact ? "mt-2" : "mt-3"} data-testid="project-facts-view">
      <dl className={`grid gap-x-4 gap-y-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {facts.map((fact) => (
          <div key={fact.key} className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mut">{tx(fact.label)}</dt>
            <dd className="text-[15px] text-ink [overflow-wrap:anywhere]">{fact.translate ? tx(fact.value) : fact.value}</dd>
          </div>
        ))}
      </dl>
      {equity ? (
        <p className="mt-2 rounded border border-brass/60 bg-brass-soft px-2.5 py-1.5 text-[13px] text-ink" data-testid="equity-caution">
          {tx(EQUITY_CAUTION)}
        </p>
      ) : null}
    </div>
  );
}
