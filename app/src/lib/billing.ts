import { phrase } from "@/lib/i18n/phrases";
import { paymentRequired } from "@/lib/payments";

export const PAUSE_MONTH_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
export const RESUME_REMINDER_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

/** Billing controls (pause, cancel, cards) are only for paid roles with a dues record. Free roles never see them. */
export function showsBillingControls(user: { role: string; paymentStatus: string }): boolean {
  return paymentRequired(user.role) && user.paymentStatus !== "NOT_REQUIRED";
}

export function parsePauseMonths(value: unknown): number | null {
  const months = Number(value);
  return Number.isInteger(months) && months >= 1 && months <= 6 ? months : null;
}

/** Same day of the month, `months` later (clamped to the month's last day). */
export function addMonths(from: Date, months: number): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(from.getUTCDate(), lastDay), from.getUTCHours(), from.getUTCMinutes()));
}

export function isPaused(user: { pausedUntil: Date | null }, now = new Date()): boolean {
  return Boolean(user.pausedUntil && user.pausedUntil.getTime() > now.getTime());
}

/** The reminder goes out once, in the 7 days before the pause ends. */
export function resumeReminderDue(input: { pausedUntil: Date | null; sentAt: Date | null; pausedAt: Date | null; now?: Date }): boolean {
  if (!input.pausedUntil) return false;
  const now = input.now ?? new Date();
  const left = input.pausedUntil.getTime() - now.getTime();
  if (left < 0 || left > RESUME_REMINDER_DAYS * DAY) return false;
  if (!input.sentAt) return true;
  return Boolean(input.pausedAt && input.sentAt.getTime() < input.pausedAt.getTime());
}

/** The pause is over: dues resume at the full monthly price from the pause end date. */
export function pauseEnded(user: { pausedUntil: Date | null }, now = new Date()): boolean {
  return Boolean(user.pausedUntil && user.pausedUntil.getTime() <= now.getTime());
}

export type StoredMethod = { role: "PRIMARY" | "BACKUP"; stripePaymentMethodId: string };

/** Charge order: the primary card first, then the backup card if the primary fails. */
export function chargeOrder<T extends StoredMethod>(methods: T[]): T[] {
  return [...methods].sort((a, b) => (a.role === b.role ? 0 : a.role === "PRIMARY" ? -1 : 1));
}

/** The card to try after `failedId` fails, if any. */
export function fallbackMethod<T extends StoredMethod>(methods: T[], failedId: string): T | null {
  return chargeOrder(methods).find((method) => method.stripePaymentMethodId && method.stripePaymentMethodId !== failedId) ?? null;
}

export function methodLabel(method: { brand: string; last4: string; wallet: string }): string {
  const brand = method.brand ? method.brand[0].toUpperCase() + method.brand.slice(1) : "Card";
  const wallet = method.wallet === "apple_pay" ? "Apple Pay · " : method.wallet === "google_pay" ? "Google Pay · " : "";
  return `${wallet}${brand} •••• ${method.last4}`;
}

/** Only a publishable test key is sent to the browser. */
export function stripePublishableTestKey(env: NodeJS.ProcessEnv = process.env): string {
  const key = env.STRIPE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  return key.startsWith("pk_test") ? key : "";
}

export const RESUME_REMINDER_SUBJECT = "Your Private Floor membership resumes next week";

/** Email, in the member's language, one week before a paused membership resumes at $199 per month. */
export function resumeReminderEmail(locale: Parameters<typeof phrase>[0], name: string, resumeDate: string) {
  const p = (text: string) => phrase(locale, text);
  return {
    subject: p(RESUME_REMINDER_SUBJECT),
    text: `${p("Hello")} ${name},\n\n${p("Your paused membership resumes on")} ${resumeDate}. ${p("If you take no action, dues resume automatically at the full price of $199 per month.")} ${p("You can extend the pause or cancel in Settings.")}\n`,
  };
}

