import { tierLabel } from "@/lib/format";

export function TierBadge({ tier }: { tier: string }) {
  const label = tierLabel(tier);
  if (tier === "CONFIRMED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-brass bg-brass px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-paper">
        <span className="grid h-[11px] w-[11px] place-items-center rounded-full bg-paper text-[6px] text-brass">✓✓</span>
        {label}
      </span>
    );
  }
  if (tier === "INVITED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-mut px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-mut">
        <span className="grid h-[11px] w-[11px] place-items-center rounded-full bg-mut text-[8px] text-paper">○</span>
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-brass px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-forest">
      <span className="grid h-[11px] w-[11px] place-items-center rounded-full bg-brass text-[8px] text-paper">✓</span>
      {label}
    </span>
  );
}

export function KindTag({ kind, roleLabel }: { kind: "DEAL" | "SEEKING" | "NORMAL"; roleLabel?: string }) {
  if (kind === "SEEKING") {
    return (
      <span className="rounded-sm border border-forest bg-paper px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-forest">
        Seeking {roleLabel || "role"}
      </span>
    );
  }
  if (kind === "DEAL") {
    return (
      <span className="rounded-sm bg-forest px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brass-pale">Deal</span>
    );
  }
  return null;
}
