import type { RoleId } from "@/lib/roles";

/** Full monthly price. The first charge is half of this. Free roles stay at zero. */
export const GC_MONTHLY_CENTS = 14_900;
export const BROKER_MONTHLY_CENTS = 12_900;
export const ADVISOR_MONTHLY_CENTS = 12_900;

const FREE_ROLES = new Set(["DEVELOPER", "INVESTOR_PE", "FAMILY_OFFICE", "LENDER"]);
const BROKER_ROLES = new Set(["BROKER", "MORTGAGE_BROKER"]);
const LEGACY_YEARLY_CENTS = new Set([240_000, 180_000, 120_000]);

export function monthlyDuesCents(role: string): number {
  if (FREE_ROLES.has(role)) return 0;
  if (role === "GENERAL_CONTRACTOR") return GC_MONTHLY_CENTS;
  if (BROKER_ROLES.has(role)) return BROKER_MONTHLY_CENTS;
  return ADVISOR_MONTHLY_CENTS;
}

/** Older rows stored a yearly amount. The price on the account is the monthly price. */
export function currentMonthlyCents(role: string, stored = 0): number {
  const monthly = monthlyDuesCents(role);
  if (monthly === 0) return 0;
  if (stored <= 0 || LEGACY_YEARLY_CENTS.has(stored)) return monthly;
  return stored;
}

/** Paid, waived, and free memberships show the active state. Everything else still needs a payment. */
export function payPageState(status: string): "active" | "due" {
  if (status === "PAID" || status === "WAIVED" || status === "NOT_REQUIRED") return "active";
  return "due";
}

export function firstMonthCents(monthlyCents: number): number {
  if (monthlyCents <= 0) return 0;
  return Math.round(monthlyCents / 2);
}

export function formatMoney(cents: number): string {
  const whole = cents % 100 === 0;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function duesLabel(cents: number): string {
  if (cents <= 0) return "No monthly dues";
  return `${formatMoney(cents)} per month`;
}

/** Full price sits next to the half-price first month. */
export function offerLabel(monthlyCents: number): string {
  if (monthlyCents <= 0) return "No monthly dues";
  return `First month ${formatMoney(firstMonthCents(monthlyCents))} (50% off), then ${formatMoney(monthlyCents)} per month`;
}

export const DUES_WAIVED = "Dues waived by an administrator.";

/**
 * Applicant status page. Declined shows no money. A free role shows no cost line.
 * A paid membership shows that it is active and, when known, the next charge date.
 */
export function statusMembershipLine(input: {
  status: string;
  monthlyCents: number;
  waived: boolean;
  paymentStatus?: string | null;
  renewalLabel?: string | null;
}): string | null {
  if (input.status === "DECLINED" || input.status === "REJECTED") return null;
  if (input.paymentStatus === "PAID" || input.paymentStatus === "WAIVED") {
    const when = input.paymentStatus === "PAID" && input.renewalLabel ? ` Next charge date ${input.renewalLabel}.` : "";
    return `This membership is active.${when}`;
  }
  if (input.monthlyCents <= 0) return null;
  if (input.status === "APPROVED" || input.status === "PAYMENT_DUE") {
    if (input.waived) return `${offerLabel(input.monthlyCents)}. ${DUES_WAIVED}`;
    return `${offerLabel(input.monthlyCents)}. ${DUES_DUE_NOW_NOTE}`;
  }
  return applicantDuesSentence(input.monthlyCents, input.waived);
}

/** Status-page dues line. A free role does not get a cost sentence. */
export function applicantDuesSentence(monthlyCents: number, waived: boolean): string {
  if (monthlyCents <= 0) return "";
  const offer = `${offerLabel(monthlyCents)}. ${DUES_BILLING_NOTE}`;
  return waived ? `${offer} ${DUES_WAIVED}` : offer;
}

export const DUES_BILLING_NOTE =
  "Month to month. No long-term contract. Cancel anytime. The first month is 50% off, then the full monthly price. Due only after approval. Flat, never based on a deal.";

/** Same schedule, for someone already approved who still needs to pay. */
export const DUES_DUE_NOW_NOTE = DUES_BILLING_NOTE.replace(
  "Due only after approval.",
  "Dues are due now to activate your membership.",
);

/** Same sentence as the billing note. Older imports still compile. */
export const DUES_ANNUAL_NOTE = DUES_BILLING_NOTE;

export const DUES_FREE_LINE = "Free for developers, investors and LPs, family offices, and lenders.";

export const DUES_TABLE: { role: string; amount: string }[] = [
  { role: "General contractors", amount: offerLabel(GC_MONTHLY_CENTS) },
  { role: "Brokers", amount: offerLabel(BROKER_MONTHLY_CENTS) },
  { role: "Attorneys and advisors", amount: offerLabel(ADVISOR_MONTHLY_CENTS) },
  { role: "Developers, investors and LPs, family offices, and lenders", amount: "Free" },
];

/** Paid rows for an applicant who has a price. A free role does not see a Free line. */
export function paidDuesRows(): { role: string; amount: string }[] {
  return DUES_TABLE.filter((row) => row.amount !== "Free");
}

export const DUES_SCHEDULE_SENTENCE = `${DUES_TABLE[0].role}: ${DUES_TABLE[0].amount}. ${DUES_TABLE[1].role}: ${DUES_TABLE[1].amount}. ${DUES_TABLE[2].role}: ${DUES_TABLE[2].amount}. ${DUES_FREE_LINE} ${DUES_BILLING_NOTE}`;

/** Apply page schedule. Paid prices stay. It does not say a free role has no dues. */
export function applyDuesSchedule(): string {
  return `${DUES_TABLE[0].role}: ${DUES_TABLE[0].amount}. ${DUES_TABLE[1].role}: ${DUES_TABLE[1].amount}. ${DUES_TABLE[2].role}: ${DUES_TABLE[2].amount}. ${DUES_BILLING_NOTE}`;
}

export type DuesLocale = "en" | "es" | "de" | "ja";

export const DUES_LOCALES: { id: DuesLocale; label: string; text: string }[] = [
  { id: "en", label: "English", text: DUES_SCHEDULE_SENTENCE },
  {
    id: "es",
    label: "Español",
    text: "Contratistas generales: primer mes $74.50 (50% de descuento), luego $149 al mes. Corredores: primer mes $64.50 (50% de descuento), luego $129 al mes. Abogados y asesores: primer mes $64.50 (50% de descuento), luego $129 al mes. Gratis para desarrolladores, inversionistas y LPs, family offices y prestamistas. Mes a mes. Sin contrato a largo plazo. Cancela cuando quieras. El primer mes es al 50%, y después se cobra el precio mensual completo. Se cobra solo después de la aprobación. Es una cuota fija y no depende de ningún trato.",
  },
  {
    id: "de",
    label: "Deutsch",
    text: "Generalunternehmer: erster Monat $74.50 (50% Rabatt), danach $149 pro Monat. Makler: erster Monat $64.50 (50% Rabatt), danach $129 pro Monat. Anwälte und Berater: erster Monat $64.50 (50% Rabatt), danach $129 pro Monat. Kostenlos für Entwickler, Investoren und LPs, Family Offices und Kreditgeber. Monat für Monat. Kein Langzeitvertrag. Jederzeit kündbar. Der erste Monat kostet die Hälfte, danach gilt der volle Monatspreis. Fällig erst nach der Freigabe. Eine feste Gebühr, unabhängig von einem Geschäft.",
  },
  {
    id: "ja",
    label: "日本語",
    text: "ゼネコン：初月 $74.50（50%引き）、その後は月額 $149。ブローカー：初月 $64.50（50%引き）、その後は月額 $129。弁護士とアドバイザー：初月 $64.50（50%引き）、その後は月額 $129。デベロッパー、投資家とLP、ファミリーオフィス、レンダーは無料。月単位。長期契約なし。いつでも解約できます。初月は半額で、その後は月額の全額です。承認後にのみ請求します。取引に連動しない定額です。",
  },
];

export function adminDuesLine(cents: number, waived: boolean): string {
  if (cents <= 0) return "Free role - no dues";
  const monthly = LEGACY_YEARLY_CENTS.has(cents) ? 0 : cents;
  const label = offerLabel(monthly > 0 ? monthly : cents === 240_000 ? GC_MONTHLY_CENTS : cents === 180_000 ? BROKER_MONTHLY_CENTS : cents === 120_000 ? ADVISOR_MONTHLY_CENTS : cents);
  if (waived) return `${label}. ${DUES_WAIVED}`;
  return `${label}. ${DUES_BILLING_NOTE}`;
}

export function duesForRole(role: RoleId | string): { cents: number; label: string; waived: string; firstCents: number } {
  const cents = monthlyDuesCents(role);
  return {
    cents,
    label: cents > 0 ? offerLabel(cents) : duesLabel(0),
    waived: DUES_WAIVED,
    firstCents: firstMonthCents(cents),
  };
}

export function mailDuesAmounts(role: string, stored = 0): { monthlyCents: number; duesAmount: string; introAmount: string } {
  const monthlyCents = currentMonthlyCents(role, stored);
  return {
    monthlyCents,
    duesAmount: duesLabel(monthlyCents),
    introAmount: formatMoney(firstMonthCents(monthlyCents)),
  };
}

/** Older call sites. The amount is the monthly price. */
export const annualDuesCents = monthlyDuesCents;
