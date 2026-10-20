export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-serif uppercase ${light ? "text-white" : "text-navy"}`}>
      <i
        className={`relative inline-block h-[18px] w-[18px] rotate-45 border ${light ? "border-white" : "border-navy"}`}
        aria-hidden
      >
        <i className={`absolute inset-1 ${light ? "bg-terra" : "bg-navy"}`} />
      </i>
      {compact ? null : <span className="text-[17px] tracking-[0.22em]">FrontDoor</span>}
    </span>
  );
}
