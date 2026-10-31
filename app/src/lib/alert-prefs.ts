/**
 * #29 alert email settings. The bell always records an alert; these choose which alerts also go by email and how.
 * For now every email goes only to the test recipient (see src/lib/notices.ts). At launch each member's own address.
 */
export const ALERT_EMAIL_TYPES = [
  { field: "notifyMatches", label: "New matching members", otherLabel: "New projects seeking my category" },
  { field: "notifyProjectDecisions", label: "Staff decisions on my projects" },
  { field: "notifyDocuments", label: "Document updates on projects I'm part of" },
  { field: "notifyDealRoom", label: "Deal room activity" },
] as const;

export type AlertField = (typeof ALERT_EMAIL_TYPES)[number]["field"];
export type AlertDigest = "INSTANT" | "DAILY";

export const ALERT_DIGESTS: { id: AlertDigest; label: string }[] = [
  { id: "INSTANT", label: "Instant: one email per alert" },
  { id: "DAILY", label: "Daily digest: one summary email a day" },
];

export function readAlertPrefs(form: { get(name: string): unknown }): Record<AlertField, boolean> & { alertDigest: AlertDigest } {
  const out = {} as Record<AlertField, boolean>;
  for (const item of ALERT_EMAIL_TYPES) out[item.field] = form.get(item.field) === "on";
  return { ...out, alertDigest: form.get("alertDigest") === "DAILY" ? "DAILY" : "INSTANT" };
}
