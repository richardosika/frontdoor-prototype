import { DUES_LOCALES } from "@/lib/dues";

const DUE_NOW: [string, string][] = [
  ["Due only after approval.", "Dues are due now to activate your membership."],
  ["Se cobra solo después de la aprobación.", "Las cuotas vencen ahora para activar la membresía."],
  ["Fällig erst nach der Freigabe.", "Die Beiträge sind jetzt fällig, um die Mitgliedschaft zu aktivieren."],
  ["承認後にのみ請求します。", "会員資格を有効にするため、今お支払いが必要です。"],
];

function duesCopy(text: string, dueNow: boolean): string {
  if (!dueNow) return text;
  return DUE_NOW.reduce((line, [from, to]) => line.replaceAll(from, to), text);
}

export function DuesLanguages({ dueNow = false }: { dueNow?: boolean }) {
  return (
    <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">English, Spanish, German, Japanese</p>
      {DUES_LOCALES.map((row) => (
        <p key={row.id} lang={row.id}>
          <b>{row.label}. </b>
          {duesCopy(row.text, dueNow)}
        </p>
      ))}
      <p className="text-xs text-mut">The English version governs if a translation differs.</p>
    </div>
  );
}
