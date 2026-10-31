import type { BidField } from "@/lib/bid-templates";
import { numeric } from "@/lib/bids";

export const h2 = "mb-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-brass";
export const SECTIONS = [
  ["price", "Price"],
  ["terms", "Schedule & terms"],
  ["risk", "Risk & qualifications"],
  ["scope", "Exclusions & scope"],
] as const;

export function money(n: number, cents = false): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents ? 2 : 0, minimumFractionDigits: cents ? 2 : 0 }).format(n);
}

export function fmtDate(iso: string, locale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

/** One value for display. Empty -> "". */
export function showValue(field: BidField, value: unknown, locale: string, tx: (s: string) => string): string {
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) return "";
  const n = numeric(value);
  switch (field.type) {
    case "money":
      return n == null ? String(value) : money(n);
    case "percent":
      return n == null ? String(value) : `${n}%`;
    case "months":
      return n == null ? String(value) : `${n} ${tx("mo")}`;
    case "date":
      return fmtDate(String(value), locale);
    case "yesno":
      return tx(value === "yes" ? "Yes" : "No");
    case "checks":
      return (value as string[]).map(tx).join(", ");
    default:
      return String(value);
  }
}

export const STATUS_TONE: Record<string, string> = {
  DRAFT: "border-line text-mut",
  SUBMITTED: "border-brass text-forest",
  SHORTLISTED: "border-forest text-forest",
  AWARDED: "border-forest bg-forest text-paper",
  DECLINED: "border-line text-mut",
  NOT_SELECTED: "border-line text-mut",
  OPEN: "border-brass text-forest",
  CLOSED: "border-line text-mut",
  NEW: "border-brass bg-brass text-paper",
};
export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  SHORTLISTED: "Shortlisted",
  AWARDED: "Awarded",
  DECLINED: "Declined",
  NOT_SELECTED: "Not selected",
  OPEN: "Open",
  CLOSED: "Closed",
  NEW: "Proposal needed",
};

export function StatusPill({ status, tx }: { status: string; tx: (s: string) => string }) {
  return <span className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-[13px] font-semibold ${STATUS_TONE[status] ?? STATUS_TONE.OPEN}`} data-testid={`bid-status-${status}`}>{tx(STATUS_LABEL[status] ?? status)}</span>;
}

export function SampleTag({ tx }: { tx: (s: string) => string }) {
  return <span className="rounded-sm bg-brass px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-paper">{tx("Sample data")}</span>;
}
