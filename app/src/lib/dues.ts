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
  return `$${(cents / 100).toLocaleString("en-US")} a year`;
}

export const DUES_WAIVED = "Founding member: dues waived during testing";

/** Admin application header. A free role is not a waived paid membership. */
export function adminDuesLine(cents: number, waived: boolean): string {
  if (cents <= 0) return "Free role - no dues";
  if (waived) return `${duesLabel(cents)}. ${DUES_WAIVED}`;
  return `${duesLabel(cents)}. Billed after approval. Never a deal fee.`;
}

export function duesForRole(role: RoleId | string): { cents: number; label: string; waived: string } {
  const cents = annualDuesCents(role);
  return { cents, label: duesLabel(cents), waived: DUES_WAIVED };
}
