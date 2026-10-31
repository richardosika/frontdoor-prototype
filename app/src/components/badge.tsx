import { serverTx } from "@/lib/i18n/server";
import { membershipChipLabel } from "@/lib/format";
import { VERIFIED_EXPLANATION } from "@/lib/membership-copy";
import { committeeFileLabel, type PublicVerification } from "@/lib/verification";

export async function TierBadge({ tier }: { tier: string }) {
  const tx = await serverTx();
  const label = tx(membershipChipLabel(tier));
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-forest bg-forest px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-paper">
      {label}
    </span>
  );
}

export async function VerifiedMark({ view }: { view: PublicVerification }) {
  const tx = await serverTx();
  if (view.showBadge && view.verifiedOn) {
    const verifiedOn = new Date(view.verifiedOn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const expiresOn = view.expiresOn
      ? new Date(view.expiresOn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : null;
    return (
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1 rounded-sm border border-brass bg-brass px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-paper">
          <span className="grid h-[11px] w-[11px] place-items-center rounded-full bg-paper text-[8px] text-brass">✓</span>
          {tx(committeeFileLabel(true))}
        </span>
        <span className="text-[11px] text-mut">
          {tx(VERIFIED_EXPLANATION)} {tx("File verified")} {verifiedOn}
          {expiresOn ? ` · ${tx("Re-verify by")} ${expiresOn}` : ""}
        </span>
      </span>
    );
  }
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-mut">{tx(committeeFileLabel(false))}</span>
  );
}

export async function KindTag({ kind, roleLabel }: { kind: "DEAL" | "SEEKING" | "NORMAL"; roleLabel?: string }) {
  const tx = await serverTx();
  if (kind === "SEEKING") {
    return (
      <span className="rounded-sm border border-forest bg-paper px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-forest">
        {tx("Seeking")} {roleLabel || tx("role")}
      </span>
    );
  }
  if (kind === "DEAL") {
    return (
      <span className="rounded-sm bg-forest px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brass-pale">{tx("Deal")}</span>
    );
  }
  return null;
}
