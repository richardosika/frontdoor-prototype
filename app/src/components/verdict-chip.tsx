import { verdictLabel } from "@/lib/application-status";

export function VerdictChip({ verdict, score }: { verdict: string | null | undefined; score: number | null | undefined }) {
  const label = verdictLabel(verdict);
  const tone =
    verdict === "LEGIT"
      ? "border-forest bg-forest text-paper"
      : verdict === "NOT_LEGIT"
        ? "border-brass bg-brass text-paper"
        : "border-brass bg-brass-soft text-forest";
  return (
    <span className={`inline-flex items-center gap-2 rounded-sm border px-2 py-1 text-[11px] uppercase tracking-wide ${tone}`}>
      {label}
      {typeof score === "number" ? <b>{score}</b> : null}
    </span>
  );
}
