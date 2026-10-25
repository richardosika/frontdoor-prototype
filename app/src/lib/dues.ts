import type { RoleId } from "@/lib/roles";

/** Annual dues in cents. Live charges wait on Stripe test keys. No card number is stored. */
export function annualDuesCents(role: string): number {
  if (role === "DEVELOPER" || role === "INVESTOR_PE" || role === "FAMILY_OFFICE" || role === "LENDER") return 0;
  if (role === "GENERAL_CONTRACTOR") return 240_000;
  if (role === "BROKER" || role === "MORTGAGE_BROKER") return 180_000;
  return 120_000;
}

export function duesLabel(cents: number): string {
  if (cents === 0) return "No annual dues";
  return `$${(cents / 100).toLocaleString("en-US")} per year`;
}

export const DUES_WAIVED = "Founding member: dues waived during testing";

/** Shown wherever the schedule is summarized. */
export const DUES_ANNUAL_NOTE = "Billed once a year. Due only after approval. Flat, never based on a deal.";

export const DUES_FREE_LINE = "Free for developers, investors and LPs, family offices, and lenders.";

export const DUES_TABLE: { role: string; amount: string }[] = [
  { role: "General contractors", amount: duesLabel(annualDuesCents("GENERAL_CONTRACTOR")) },
  { role: "Brokers", amount: duesLabel(annualDuesCents("BROKER")) },
  { role: "Attorneys and advisors", amount: duesLabel(annualDuesCents("RE_ATTORNEY")) },
  { role: "Developers, investors and LPs, family offices, and lenders", amount: "Free" },
];

export const DUES_SCHEDULE_SENTENCE = `${DUES_TABLE[0].role}: ${DUES_TABLE[0].amount}. ${DUES_TABLE[1].role}: ${DUES_TABLE[1].amount}. ${DUES_TABLE[2].role}: ${DUES_TABLE[2].amount}. ${DUES_FREE_LINE} ${DUES_ANNUAL_NOTE}`;

/** Admin application header. A free role is not a waived paid membership. */
export function adminDuesLine(cents: number, waived: boolean): string {
  if (cents <= 0) return "Free role - no dues";
  if (waived) return `${duesLabel(cents)}. ${DUES_WAIVED}`;
  return `${duesLabel(cents)}. ${DUES_ANNUAL_NOTE}`;
}

export function duesForRole(role: RoleId | string): { cents: number; label: string; waived: string } {
  const cents = annualDuesCents(role);
  return { cents, label: duesLabel(cents), waived: DUES_WAIVED };
}
