import { personStatusLabel } from "@/lib/person-standing";

export function StatusChip({ status }: { status: string }) {
  const label = personStatusLabel(status);
  const tone =
    status === "APPROVED"
      ? "border-forest bg-forest text-paper"
      : status === "DECLINED"
        ? "border-[#7A2E2E] text-[#7A2E2E]"
        : "border-brass text-brass";
  return <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone}`}>{label}</span>;
}

export function DemoChip() {
  return <span className="inline-flex items-center rounded-sm border border-brass bg-brass-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brass">Demo</span>;
}
