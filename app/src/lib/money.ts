/** Read a project value such as "$24M", "$2.5 million", "24,000,000" or "$850K" as dollars, or null. */
export function parseDollars(label: string): number | null {
  const clean = label.toLowerCase().replace(/[$,\s]/g, "");
  const match = clean.match(/^(\d+(?:\.\d+)?)(k|m|mm|million|b|bn|billion)?/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  const unit = match[2] ?? "";
  if (unit === "k") return n * 1_000;
  if (unit === "m" || unit === "mm" || unit === "million") return n * 1_000_000;
  if (unit === "b" || unit === "bn" || unit === "billion") return n * 1_000_000_000;
  return n;
}

const NUMBER_LOCALE: Record<string, string> = { en: "en-US", es: "es-ES", de: "de-DE", ja: "ja-JP" };

/** A stored or typed amount as plain digits: "$15,000,000" or "15000000" or "$15M" become "15000000". */
export function moneyDigits(value: string): string {
  const clean = value.trim();
  if (!clean) return "";
  if (/^[$\s\d.,]+$/.test(clean)) return clean.replace(/[.,]\d{1,2}$/, "").replace(/\D/g, "");
  const parsed = parseDollars(clean);
  return parsed === null ? "" : String(Math.round(parsed));
}

/** Digits grouped in the member's number format (es uses grouping from 10,000 in Intl; we force it). */
export function formatMoneyDigits(digits: string, locale = "en"): string {
  if (!digits) return "";
  const n = Number(digits);
  if (!Number.isFinite(n)) return digits;
  return new Intl.NumberFormat(NUMBER_LOCALE[locale] ?? "en-US", { maximumFractionDigits: 0, useGrouping: "always" as unknown as boolean }).format(n);
}
