import { JOIN_LOCALES } from "@/lib/join-copy";

export function JoinLanguages() {
  return (
    <div className="mt-4 space-y-2 text-sm leading-relaxed text-ink">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">English, Spanish, German, Japanese</p>
      {JOIN_LOCALES.map((row) => (
        <p key={row.id} lang={row.id}>
          <b>{row.label}. </b>
          {row.text}
        </p>
      ))}
      <p className="text-xs text-mut">The English version governs if a translation differs.</p>
    </div>
  );
}
