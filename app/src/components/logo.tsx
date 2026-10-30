import { BRAND } from "@/lib/brand";

export function Logo({ tone = "ink", compact = false, large = false }: { tone?: "ink" | "paper"; compact?: boolean; large?: boolean }) {
  if (tone === "paper" && compact) {
    // Brand SVG served as-is. The optimizer does not apply.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/brand/pf-mark.svg" alt={BRAND.name} className={large ? "h-9 w-9" : "h-7 w-7"} />;
  }
  if (tone === "paper" && large) {
    return (
      <span className="inline-flex items-center gap-3 text-paper" aria-label={BRAND.name} role="img">
        <svg viewBox="0 0 32 32" className="h-11 w-11 shrink-0" aria-hidden>
          <rect x="8" y="8" width="16" height="16" fill="none" stroke="#A8843F" strokeWidth="1.2" transform="rotate(45 16 16)" />
          <text x="16" y="19" textAnchor="middle" fontFamily="Georgia, serif" fontSize="8" fill="currentColor">
            PF
          </text>
        </svg>
        <span className="flex flex-col leading-none">
          <span className="font-serif text-[25px] uppercase tracking-[0.16em]">{BRAND.mark[0]}</span>
          <span className="mt-[5px] font-serif text-[16px] uppercase tracking-[0.34em] opacity-80">{BRAND.mark[1]}</span>
        </span>
      </span>
    );
  }
  if (tone === "paper") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/brand/lockup-reversed.svg" alt={BRAND.name} className="h-10 w-auto" />;
  }
  return (
    <span className="inline-flex items-center gap-2.5 text-forest">
      <svg viewBox="0 0 32 32" className="h-[22px] w-[22px]" aria-hidden>
        <rect x="8" y="8" width="16" height="16" fill="none" stroke="#A8843F" strokeWidth="1.4" transform="rotate(45 16 16)" />
        <text x="16" y="19" textAnchor="middle" fontFamily="Georgia, serif" fontSize="8" fill="#1F3A2E">
          PF
        </text>
      </svg>
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span className="font-serif text-[18px] uppercase tracking-[0.16em]">{BRAND.mark[0]}</span>
          <span className="mt-[3px] font-serif text-[13px] uppercase tracking-[0.28em] opacity-80">{BRAND.mark[1]}</span>
        </span>
      )}
    </span>
  );
}
