const TONE: Record<string, string> = {
  PASS: "border-forest bg-forest text-paper",
  FAIL: "border-brass bg-brass text-paper",
  INCONCLUSIVE: "border-line bg-cream text-forest",
  NOT_RUN: "border-line bg-paper text-mut",
  UNAVAILABLE: "border-brass bg-brass-soft text-forest",
};

const LABEL: Record<string, string> = {
  PASS: "Pass",
  FAIL: "Fail",
  INCONCLUSIVE: "No data",
  NOT_RUN: "Not run",
  UNAVAILABLE: "Unavailable",
};

export function EvidenceChip({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE[status] || "border-line"}`}>
      {LABEL[status] || status}
    </span>
  );
}
