/** The member's card: deep green, thin brass rule, PF mark, name in large serif. Sidebar on desktop, menu sheet on mobile. */
export function MembershipCard({ name, typeLabel = "", statusLabel, sinceLabel, className = "" }: { name: string; typeLabel?: string; statusLabel: string; sinceLabel: string; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[6px] border border-brass bg-[#13251c] px-4 pb-4 pt-3.5 text-paper shadow-[inset_0_0_0_3px_#13251c,inset_0_0_0_4px_rgba(168,132,63,0.45),0_10px_30px_rgba(0,0,0,0.25)] ${className}`}
      data-testid="membership-card"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(168,132,63,0.18),transparent_55%)]" />
      <div className="relative flex items-start justify-between">
        <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0" aria-hidden>
          <rect x="8" y="8" width="16" height="16" fill="none" stroke="#A8843F" strokeWidth="1.2" transform="rotate(45 16 16)" />
          <text x="16" y="19" textAnchor="middle" fontFamily="Georgia, serif" fontSize="8" fill="#F5EFE2">
            PF
          </text>
        </svg>
        <span className="mt-1 h-px w-10 bg-brass/70" aria-hidden />
      </div>
      <p className="relative mt-3 break-words font-serif text-[24px] leading-tight text-paper">{name}</p>
      {typeLabel ? (
        <p className="relative mt-1 font-serif text-[15px] italic text-sand" data-testid="membership-type">
          {typeLabel}
        </p>
      ) : null}
      <p className="relative mt-1.5 font-sans text-[10.5px] font-semibold uppercase tracking-[0.22em] text-brass">{statusLabel}</p>
      <p className="relative mt-2 border-t border-brass/40 pt-2 font-serif text-[13px] italic text-sand">{sinceLabel}</p>
    </div>
  );
}
