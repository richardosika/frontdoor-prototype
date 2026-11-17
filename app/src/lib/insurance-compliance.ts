import { INSURANCE_TYPES } from "@/lib/insurance";

export const INSURANCE_ROLES = [
  "SUBCONTRACTOR", "GENERAL_CONTRACTOR", "ARCHITECT_ENGINEER", "CIVIL_ENGINEER",
  "STRUCTURAL_ENGINEER", "MEP_ENGINEER", "GEOTECH_ENGINEER",
] as const;
export const POLICY_TYPES = INSURANCE_TYPES.filter(({ id }) => id !== "SURETY");
export const MAX_POLICIES = 8;
export const INSURANCE_PATH = "/profile#insurance-compliance";
export const INSURANCE_REQUIRED = "Add your certificate of insurance or your insurance agent's email and phone.";
export const INSURANCE_DATES = "Add your policy expiration dates so we can remind you 30 days before a policy expires.";
export const POLICY_ERROR = "Choose a policy type and enter a valid expiration date for each policy.";
export const POLICY_REQUIRED = "Add at least one insurance policy with its type and expiration date.";
export const POLICY_EXPIRED = "An insurance policy has expired. Add the renewed policy and its new expiration date to keep your account active.";
export const POLICY_LIMIT_ERROR = "Enter the coverage limit for each policy.";
export const POLICY_COUNT_ERROR = "You can add up to 8 policies.";
export const INSURANCE_TIME_ZONE = "America/New_York";

/** Nov 17 (Richard): at least one dated policy is required too. Staff page status for a covered member. */
export function insuranceStatus({ complete, policyCount, suspended = false }: { complete: boolean; policyCount: number; suspended?: boolean }) {
  if (suspended) return "Suspended" as const;
  if (!complete) return "Missing" as const;
  return policyCount > 0 ? "Complete" as const : "Expiration dates missing" as const;
}

export function requiresInsurance(role: string) {
  return INSURANCE_ROLES.some((entry) => entry === role);
}

/** Nov 17 (Richard, decision 2): an extra category of sub, GC, architect or engineer counts the same as the primary role. Category ids match role ids. */
export function requiresInsuranceFor(member: { role?: string | null; extraCategories?: string | readonly string[] | null }) {
  if (requiresInsurance(member.role ?? "")) return true;
  const extra = Array.isArray(member.extraCategories) ? member.extraCategories : String(member.extraCategories ?? "").split(",");
  return extra.some((id) => requiresInsurance(String(id).trim()));
}

/** Prisma filter for members the insurance rule covers (primary role or extra category); callers re-check with requiresInsuranceFor. */
export function insuranceScopeWhere() {
  return {
    OR: [
      { role: { in: [...INSURANCE_ROLES] } },
      ...INSURANCE_ROLES.map((id) => ({ extraCategories: { contains: id } })),
    ],
  };
}

export function insuranceComplete({ hasCoi, agentEmail, agentPhone }: {
  hasCoi: boolean; agentEmail?: string | null; agentPhone?: string | null;
}) {
  return hasCoi || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agentEmail?.trim() ?? "") &&
    (agentPhone?.replace(/\D/g, "").length ?? 0) >= 7);
}

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: INSURANCE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});
const offsetFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: INSURANCE_TIME_ZONE, timeZoneName: "longOffset",
});

export function insuranceDateKey(date: Date) {
  const parts = dayFormat.formatToParts(date);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)?.value).join("-");
}

export function insuranceNoon(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || key.startsWith("0000")) return null;
  const noon = new Date(`${key}T12:00:00.000Z`);
  if (!Number.isFinite(noon.getTime()) || noon.toISOString().slice(0, 10) !== key) return null;
  const offset = offsetFormat.formatToParts(noon).find((part) => part.type === "timeZoneName")?.value.slice(3);
  return new Date(`${key}T12:00:00.000${offset || "Z"}`);
}

export type PolicyInput = { type: string; otherName?: string; expiresKey: string; limit?: string | number; aggregate?: string | number };

const MAX_AMOUNT = 2_000_000_000;
/** Whole dollars from "$1,000,000", "1000000" or a number; 0 when blank or not a number. */
export function parseAmount(value: string | number | undefined | null) {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), MAX_AMOUNT) : 0;
  const digits = String(value ?? "").split(".")[0].replace(/\D/g, "");
  return digits ? Math.min(Number(digits), MAX_AMOUNT) : 0;
}

export function validatePolicies(rows: readonly PolicyInput[], { requireLimit = true }: { requireLimit?: boolean } = {}) {
  if (rows.length > MAX_POLICIES) return { ok: false, error: POLICY_COUNT_ERROR } as const;
  const policies = [];
  for (const { type, otherName, expiresKey, limit, aggregate } of rows) {
    const limitAmount = parseAmount(limit);
    const aggregateAmount = parseAmount(aggregate);
    if (!type && !expiresKey && !otherName?.trim() && !limitAmount && !aggregateAmount) continue;
    const expiresOn = insuranceNoon(expiresKey);
    if (!expiresOn || !POLICY_TYPES.some(({ id }) => id === type)) return { ok: false, error: POLICY_ERROR } as const;
    if (!limitAmount && requireLimit) return { ok: false, error: POLICY_LIMIT_ERROR } as const;
    policies.push({ type, otherName: type === "OTHER" ? (otherName ?? "").trim().slice(0, 100) : "", expiresOn, limitAmount, aggregateAmount });
  }
  return { ok: true, policies } as const;
}

export function insuranceDaysUntil(expiresOn: Date, now: Date) {
  const day = (date: Date) => Date.parse(`${insuranceDateKey(date)}T00:00:00Z`);
  return (day(expiresOn) - day(now)) / 86_400_000;
}

export function insuranceReminderKey(userId: string, type: string, expiresKey: string) {
  return JSON.stringify([userId, type, expiresKey]);
}

export function insuranceReminderDue(policy: { userId: string; type: string; expiresOn: Date }, sentKeys: ReadonlySet<string>, now: Date) {
  const days = insuranceDaysUntil(policy.expiresOn, now);
  return days >= 0 && days <= 30 &&
    !sentKeys.has(insuranceReminderKey(policy.userId, policy.type, insuranceDateKey(policy.expiresOn)));
}

export function insurancePolicyLabel(type: string, otherName: string, tx: (text: string) => string) {
  return (type === "OTHER" && otherName) || tx(POLICY_TYPES.find(({ id }) => id === type)?.label ?? "Other");
}

/* ---------- Nov 17 (Richard, decision 4): expired policies, weekly reminders 1 to 4, then suspension. ---------- */

export const EXPIRED_WEEKS = 4;
/** Days after the 4th weekly reminder before the account is suspended. */
export const SUSPEND_AFTER_DAYS = 7;
export const SUSPENDED_NOTICE = "Your account is suspended because an insurance policy expired and was not updated. Add the current policy on your Profile to restore access right away.";

type DatedPolicy = { type: string; expiresOn: Date };

/** Expired policies with no current policy of the same type, ignoring any that expired before staff lifted a suspension. */
export function unresolvedExpired<T extends DatedPolicy>(policies: readonly T[], now: Date, liftedAt?: Date | null): T[] {
  const current = new Set(policies.filter((p) => insuranceDaysUntil(p.expiresOn, now) >= 0).map((p) => p.type));
  return policies.filter((p) => insuranceDaysUntil(p.expiresOn, now) < 0 && !current.has(p.type) && !(liftedAt && p.expiresOn < liftedAt));
}

export type SentWeek = { week: number; sentAt: Date };
const daysSince = (date: Date, now: Date) => -insuranceDaysUntil(date, now);

/**
 * The next weekly reminder due for an expired policy, or null. Week 1 goes the day after it expires; each later week
 * waits at least 7 days after the previous one, so a member always gets four reminders a week apart.
 */
export function expiredWeekDue(expiresOn: Date, sent: readonly SentWeek[], now: Date): number | null {
  const past = daysSince(expiresOn, now);
  if (past < 1) return null;
  const last = sent.reduce<SentWeek | null>((top, row) => (!top || row.week > top.week ? row : top), null);
  const next = (last?.week ?? 0) + 1;
  if (next > EXPIRED_WEEKS) return null;
  if (last && daysSince(last.sentAt, now) < 7) return null;
  return next;
}

/** The day the account is suspended, as of reminder `week` sent on `sentOn`: one week per remaining reminder, plus the final week. */
export function suspensionDate(week: number, sentOn: Date) {
  const key = insuranceDateKey(sentOn);
  const day = new Date(`${key}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 7 * (EXPIRED_WEEKS - week) + SUSPEND_AFTER_DAYS);
  return insuranceNoon(day.toISOString().slice(0, 10))!;
}

/** Suspension is due only after the 4th weekly reminder went out at least SUSPEND_AFTER_DAYS ago. */
export function suspensionDue(sent: readonly SentWeek[], now: Date) {
  const final = sent.find((row) => row.week === EXPIRED_WEEKS);
  return Boolean(final && daysSince(final.sentAt, now) >= SUSPEND_AFTER_DAYS);
}

/** Member-facing summary: type, limits and whether the policy is current. Never the COI or the agent. */
export function policyLimitLine(
  policy: { type: string; otherName: string; expiresOn: Date; limitAmount: number; aggregateAmount: number },
  now: Date, tx: (text: string) => string, money: (amount: number) => string,
) {
  const amounts = [policy.limitAmount, policy.aggregateAmount].filter((n) => n > 0).map(money).join(" / ");
  const state = insuranceDaysUntil(policy.expiresOn, now) >= 0 ? tx("Current") : tx("Expired");
  return [insurancePolicyLabel(policy.type, policy.otherName, tx), amounts, state].filter(Boolean).join(" · ");
}

/** Pages a member suspended for insurance can still open. */
export const SUSPENSION_ALLOWED_PATHS = ["/profile", "/settings", "/alerts"];
export function insuranceSuspensionAllows(path: string) {
  return SUSPENSION_ALLOWED_PATHS.some((allowed) => path === allowed || path.startsWith(`${allowed}/`));
}
