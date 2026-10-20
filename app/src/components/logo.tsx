import { BRAND } from "@/lib/brand";

export function Logo({ tone = "ink", compact = false }: { tone?: "ink" | "paper"; compact?: boolean }) {
  const onForest = tone === "paper";
  return (
    <span className={`inline-flex items-center gap-2.5 ${onForest ? "text-paper" : "text-forest"}`}>
      <i
        className={`relative inline-block h-[18px] w-[18px] rotate-45 border ${onForest ? "border-brass" : "border-forest"}`}
        aria-hidden
      >
        <i className={`absolute inset-1 ${onForest ? "bg-brass" : "bg-forest"}`} />
      </i>
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span className="font-serif text-[18px] uppercase tracking-[0.22em]">{BRAND.short}</span>
          <span className="mt-[3px] font-sans text-[8px] uppercase tracking-[0.32em] opacity-75">{BRAND.sub}</span>
        </span>
      )}
    </span>
  );
}
