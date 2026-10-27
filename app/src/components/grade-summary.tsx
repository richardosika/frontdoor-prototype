import { EvidenceChip } from "@/components/evidence-chip";
import { newsStoryChipLabel } from "@/lib/verify/news";
import { rubricSections, type GradeReport, type Recommendation } from "@/lib/verify/grade";
import { publicEvidenceHref } from "@/lib/evidence-link";
import { shownRegistryCheck } from "@/lib/state-registry-search";
import { reviewCheckKey, reviewCopy } from "@/lib/review-copy";
import { formatAuditTime } from "@/lib/format";
import { card, sectionLabel } from "@/components/ui";

export function GradeMark({
  letter,
  score,
  recommendation,
  confidence,
}: {
  letter?: string | null;
  score?: number | null;
  recommendation?: string | null;
  confidence?: string | null;
}) {
  if (!letter) {
    return <span className="text-xs uppercase tracking-wide text-mut">Not graded</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-baseline gap-1 rounded-sm border px-2 py-1 ${letterTone(letter)}`}>
        <b className="font-serif text-lg font-normal leading-none">{letter}</b>
        {typeof score === "number" ? <span className="text-[11px]">{score}</span> : null}
      </span>
      {recommendation ? <RecommendationChip recommendation={recommendation} /> : null}
      {confidence ? <span className="text-[11px] uppercase tracking-wide text-mut">Confidence {confidence}</span> : null}
    </span>
  );
}

export function RecommendationChip({ recommendation }: { recommendation: string }) {
  return (
    <span className={`inline-flex items-center rounded-sm border px-2 py-1 text-[11px] uppercase tracking-wide ${recommendationTone(recommendation)}`}>
      {recommendation}
    </span>
  );
}

export function ExecutiveSummary({ report, title = "Executive summary", role }: { report: GradeReport; title?: string; role?: string | null }) {
  const rubric = rubricSections();
  return (
    <section className={`${card} mt-4 p-4 md:p-6`}>
      <h2 className={sectionLabel}>{title}</h2>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`font-serif text-6xl font-normal leading-none ${report.letter === "F" || report.letter === "D" ? "text-[#7A2E2E]" : "text-forest"}`}>
            {report.letter}
          </p>
          <p className="mt-2 text-sm text-ink">{report.score} of 100</p>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <RecommendationChip recommendation={report.recommendation} />
          <span className="text-[11px] uppercase tracking-wide text-mut">Confidence {report.confidence}</span>
        </div>
      </div>
      {report.gradedAt && !Number.isNaN(new Date(report.gradedAt).getTime()) ? (
        <p className="mt-3 text-xs text-mut">Graded {formatAuditTime(new Date(report.gradedAt))}</p>
      ) : null}
      {report.banner ? (
        <div className="mt-4 rounded-sm bg-[#7A2E2E] px-4 py-3 text-sm leading-relaxed text-paper" role="alert">
          {report.banner}
        </div>
      ) : null}
      <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink">
        <SummaryBlock title="Applicant" body={reviewCopy(report.summary.applicant, role)} />
        <SummaryBlock title="Company" body={reviewCopy(report.summary.company)} />
        <SummaryBlock title="What checked out" body={reviewCopy(report.summary.checkedOut)} />
        <SummaryBlock title="What did not check out" body={reviewCopy(report.summary.didNotCheckOut)} />
        <SummaryBlock title="What could not be checked for free" body={reviewCopy(report.summary.couldNotCheck)} />
        <SummaryBlock title="Recommendation" body={reviewCopy(`${report.recommendation}. ${report.summary.reasoning} Next step: ${report.summary.nextStep}`)} />
      </div>
      {report.changeNote ? <p className="mt-4 text-xs leading-relaxed text-mut">Re-run note: {reviewCopy(report.changeNote)}</p> : null}
      <div className="mt-6 border-t border-line pt-4">
        <h3 className={sectionLabel}>Needs your attention</h3>
        {report.attention.length === 0 ? <p className="mt-2 text-sm text-ink">Nothing doubtful is on this file.</p> : null}
        <ul className="mt-3 space-y-3">
          {report.attention.map((item) => (
            <li key={item.title} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityTone(item.severity)}`}>
                  {item.severity}
                </span>
                <span className="font-serif text-base text-forest">{reviewCopy(item.title)}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink">{reviewCopy(item.detail)}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 border-t border-line pt-4">
        <h3 className={sectionLabel}>Grade breakdown</h3>
        <ul className="mt-3 space-y-3">
          {report.categories.map((category) => (
            <li key={category.id} className="border-t border-line pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-serif text-base text-forest">{reviewCopy(category.label)}</span>
                <span className="shrink-0 text-sm text-ink">
                  {category.earned} / {category.possible}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink">{reviewCopy(category.reason)}</p>
            </li>
          ))}
        </ul>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-brass">How this grade is calculated</summary>
          <div className="mt-3 space-y-3">
            {rubric.map((section) => (
              <div key={section.title}>
                <h4 className="font-serif text-base text-forest">{section.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-ink">{reviewCopy(section.body)}</p>
              </div>
            ))}
            {report.caps.length ? <p className="text-sm text-ink">Caps on this file: {reviewCopy(report.caps.join(" "))}</p> : null}
          </div>
        </details>
      </div>
    </section>
  );
}

function SummaryBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-serif text-lg font-normal text-forest">{title}</h3>
      <p className="mt-1">{body}</p>
    </div>
  );
}

export function CheckTable({
  evidence,
  location = "",
  org = "",
}: {
  evidence: { id: string; checkKey: string; status: string; finding: string; source: string; url: string; ranAt: Date }[];
  location?: string;
  org?: string;
}) {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm text-brass">Show all checks</summary>
      <div className="mt-3 max-w-full overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-xs">
          <thead>
            <tr className="border-b border-line text-mut">
              <th className="py-2 pr-2">Check</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2 pr-2">Finding</th>
              <th className="py-2 pr-2">Source</th>
              <th className="py-2">When</th>
            </tr>
          </thead>
          <tbody>
            {evidence.map((row) => {
              const shown = shownRegistryCheck({ finding: row.finding, url: row.url, location, org });
              return (
              <tr key={row.id} className="border-b border-line align-top">
                <td className="py-2 pr-2">{reviewCheckKey(row.checkKey)}</td>
                <td className="py-2 pr-2">
                  <EvidenceLabel row={row} />
                </td>
                <td className="max-w-xs py-2 pr-2 break-words">
                  {reviewCopy(shown.finding)}
                  {shown.url ? (
                    <>
                      {" "}
                      <a className="underline decoration-brass" href={publicEvidenceHref(shown.url)} target="_blank" rel="noreferrer">
                        {row.checkKey === "news-story" ? "Open article" : "Link"}
                      </a>
                    </>
                  ) : null}
                </td>
                <td className="py-2 pr-2">{reviewCopy(row.source)}</td>
                <td className="py-2">{formatAuditTime(row.ranAt)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function EvidenceLabel({ row }: { row: { checkKey: string; status: string; finding: string } }) {
  const label = newsStoryChipLabel(row.checkKey, row.status, row.finding);
  if (!label) return <EvidenceChip status={row.status} />;
  return (
    <span className="inline-flex rounded-sm border border-line bg-cream px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest">
      {label}
    </span>
  );
}

function letterTone(letter: string): string {
  if (letter === "A" || letter === "B") return "border-forest bg-forest text-paper";
  if (letter === "C") return "border-brass bg-brass-soft text-forest";
  return "border-[#7A2E2E] bg-[#7A2E2E] text-paper";
}

function recommendationTone(recommendation: string): string {
  if (recommendation === "APPROVE") return "border-forest bg-forest text-paper";
  if (recommendation === "DECLINE") return "border-[#7A2E2E] bg-[#7A2E2E] text-paper";
  if (recommendation === "NEEDS MORE INFO") return "border-brass bg-brass text-paper";
  return "border-brass bg-brass-soft text-forest";
}

function severityTone(severity: string): string {
  if (severity === "High") return "bg-[#7A2E2E] text-paper";
  if (severity === "Medium") return "bg-brass text-paper";
  return "border border-line bg-cream text-forest";
}

export function recommendationNeedsConfirm(recommendation: Recommendation | string | null | undefined, verdict: string | null | undefined): boolean {
  return recommendation === "DECLINE" || verdict === "NOT_LEGIT";
}
