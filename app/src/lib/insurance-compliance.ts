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
export const POLICY_COUNT_ERROR = "You can add up to 8 policies.";
export const INSURANCE_TIME_ZONE = "America/New_York";

export function requiresInsurance(role: string) {
  return INSURANCE_ROLES.some((entry) => entry === role);
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

export type PolicyInput = { type: string; otherName?: string; expiresKey: string };

export function validatePolicies(rows: readonly PolicyInput[]) {
  if (rows.length > MAX_POLICIES) return { ok: false, error: POLICY_COUNT_ERROR } as const;
  const policies = [];
  for (const { type, otherName, expiresKey } of rows) {
    if (!type && !expiresKey && !otherName?.trim()) continue;
    const expiresOn = insuranceNoon(expiresKey);
    if (!expiresOn || !POLICY_TYPES.some(({ id }) => id === type)) return { ok: false, error: POLICY_ERROR } as const;
    policies.push({ type, otherName: type === "OTHER" ? (otherName ?? "").trim().slice(0, 100) : "", expiresOn });
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
