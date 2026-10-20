import { tierLabel } from "@/lib/format";

export function TierBadge({ tier }: { tier: string }) {
  const label = tierLabel(tier);
  if (tier === "CONFIRMED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-terra bg-terra px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-white">
        <span className="grid h-[11px] w-[11px] place-items-center rounded-full bg-white text-[6px] text-terra">✓✓</span>
        {label}
      </span>
    );
  }
  if (tier === "INVITED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-mut px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-mut">
        <span className="grid h-[11px] w-[11px] place-items-center rounded-full bg-mut text-[8px] text-white">○</span>
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-terra px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-navy">
      <span className="grid h-[11px] w-[11px] place-items-center rounded-full bg-terra text-[8px] text-white">✓</span>
      {label}
    </span>
  );
}

export function KindTag({ kind, roleLabel }: { kind: "DEAL" | "SEEKING" | "NORMAL"; roleLabel?: string }) {
  if (kind === "SEEKING") {
    return (
      <span className="rounded-md border border-navy bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-navy">
        Seeking {roleLabel || "role"}
      </span>
    );
  }
  if (kind === "DEAL") {
    return (
      <span className="rounded-md bg-terra px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Deal</span>
    );
  }
  return null;
}
