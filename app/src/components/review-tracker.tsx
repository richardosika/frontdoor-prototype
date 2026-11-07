import { serverTx } from "@/lib/i18n/server";

/** #35: Submitted, In review, Approved. "More info needed" and "Declined" replace the last step when they happen. */
export function trackerSteps(status: string): { label: string; state: "done" | "current" | "todo" | "attention" }[] {
  const last =
    status === "APPROVED"
      ? { label: "Approved", state: "done" as const }
      : status === "NEEDS_INFO"
        ? { label: "More info needed", state: "attention" as const }
        : status === "DECLINED"
          ? { label: "Declined", state: "attention" as const }
          : { label: "Approved", state: "todo" as const };
  return [
    { label: "Submitted", state: "done" },
    { label: "In review", state: status === "PENDING_REVIEW" ? "current" : "done" },
    last,
  ];
}

export async function ReviewTracker({ status }: { status: string }) {
  const tx = await serverTx();
  const steps = trackerSteps(status);
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]" data-testid="review-tracker" aria-label={tx("Review status")}>
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center gap-2" data-state={step.state}>
          <span
            aria-hidden
            className={`grid h-5 w-5 place-items-center rounded-full border text-[11px] font-bold ${
              step.state === "done" ? "border-forest bg-forest text-paper" : step.state === "current" ? "border-brass bg-brass text-paper" : step.state === "attention" ? "border-brass bg-paper text-brass" : "border-line bg-paper text-mut"
            }`}
          >
            {step.state === "done" ? "✓" : step.state === "attention" ? "!" : index + 1}
          </span>
          <span className={step.state === "todo" ? "text-mut" : "font-semibold text-forest"}>{tx(step.label)}</span>
          {index < steps.length - 1 ? <span aria-hidden className="mx-1 h-px w-5 bg-line" /> : null}
        </li>
      ))}
    </ol>
  );
}
