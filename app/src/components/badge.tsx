import { tierLabel } from "@/lib/format";
import type { PublicVerification } from "@/lib/verification";

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
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-mut px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-mut">
      <span className="grid h-[11px] w-[11px] place-items-center rounded-full bg-mut text-[8px] text-paper">○</span>
      {label}
    </span>
  );
}

export function VerifiedMark({ view }: { view: PublicVerification }) {
  if (view.showBadge && view.verifiedOn) {
    const verifiedOn = new Date(view.verifiedOn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const expiresOn = view.expiresOn
      ? new Date(view.expiresOn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : null;
    return (
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1 rounded-sm border border-brass bg-brass px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-paper">
          <span className="grid h-[11px] w-[11px] place-items-center rounded-full bg-paper text-[8px] text-brass">✓</span>
          Verified
        </span>
        <span className="text-[11px] text-mut">
          Verified {verifiedOn}
          {expiresOn ? ` · Re-verify by ${expiresOn}` : ""}
        </span>
      </span>
    );
  }
  return <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-mut">Verification in progress</span>;
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
