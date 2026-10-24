import type { RoleId } from "@/lib/roles";

/** Annual dues in cents. Nothing is charged during this test. */
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

export function duesForRole(role: RoleId | string): { cents: number; label: string; waived: string } {
  const cents = annualDuesCents(role);
  return { cents, label: duesLabel(cents), waived: DUES_WAIVED };
}
