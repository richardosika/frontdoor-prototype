/** Caps and email rules for member messaging. Defaults apply until an administrator saves settings. */

export const MESSAGING_SETTING_KEYS = {
  introDaily: "intro.daily",
  introNewAccountDaily: "intro.newAccountDaily",
  messageHourly: "message.hourly",
  reportsDaily: "reports.daily",
  outstandingIntros: "intro.outstanding",
  reRequestDays: "intro.reRequestDays",
  threadWindowMinutes: "email.threadWindowMinutes",
  newAccountDays: "intro.newAccountDays",
} as const;

export type MessagingSettings = {
  introDaily: number;
  introNewAccountDaily: number;
  messageHourly: number;
  reportsDaily: number;
  outstandingIntros: number;
  reRequestDays: number;
  threadWindowMinutes: number;
  newAccountDays: number;
};

export const MESSAGING_DEFAULTS: MessagingSettings = {
  introDaily: 10,
  introNewAccountDaily: 5,
  messageHourly: 30,
  reportsDaily: 5,
  outstandingIntros: 25,
  reRequestDays: 90,
  threadWindowMinutes: 240,
  newAccountDays: 14,
};

export const REPORT_CATEGORIES = ["SPAM", "SOLICITATION", "HARASSMENT", "IMPERSONATION", "OTHER"] as const;
export type ReportCategoryId = (typeof REPORT_CATEGORIES)[number];

export const REPORT_CATEGORY_LABELS: Record<ReportCategoryId, string> = {
  SPAM: "Spam",
  SOLICITATION: "Solicitation",
  HARASSMENT: "Harassment",
  IMPERSONATION: "Impersonation",
  OTHER: "Other",
};

export const REPORT_STATUSES = ["OPEN", "REVIEWING", "ACTIONED", "DISMISSED"] as const;

export const DECLINE_SENDER_LINE = "Not available now";

const DAY = 24 * 60 * 60 * 1000;

function unwrap(value: unknown): unknown {
  if (value && typeof value === "object" && "n" in value) return (value as { n: unknown }).n;
  return value;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const raw = unwrap(value);
  const number = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function parseMessagingSettings(rows: { key: string; value: unknown }[]): MessagingSettings {
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const read = (key: keyof typeof MESSAGING_SETTING_KEYS, min: number, max: number) =>
    clampInt(map.get(MESSAGING_SETTING_KEYS[key]), MESSAGING_DEFAULTS[key], min, max);
  return {
    introDaily: read("introDaily", 1, 100),
    introNewAccountDaily: read("introNewAccountDaily", 1, 100),
    messageHourly: read("messageHourly", 1, 200),
    reportsDaily: read("reportsDaily", 1, 50),
    outstandingIntros: read("outstandingIntros", 1, 200),
    reRequestDays: read("reRequestDays", 0, 365),
    threadWindowMinutes: read("threadWindowMinutes", 1, 24 * 60),
    newAccountDays: read("newAccountDays", 0, 90),
  };
}

export function introDailyCap(input: { accountCreatedAt: Date; now: Date; settings: MessagingSettings }): number {
  const age = input.now.getTime() - input.accountCreatedAt.getTime();
  if (age >= 0 && age < input.settings.newAccountDays * DAY) return input.settings.introNewAccountDaily;
  return input.settings.introDaily;
}

export function introRequestDecision(input: {
  sentToday: number;
  outstanding: number;
  accountCreatedAt: Date;
  now: Date;
  lastDeclinedAt: Date | null;
  settings: MessagingSettings;
}): { ok: true } | { ok: false; reason: string } {
  if (input.lastDeclinedAt) {
    const wait = input.settings.reRequestDays * DAY;
    if (input.now.getTime() - input.lastDeclinedAt.getTime() < wait) {
      return { ok: false, reason: "You can send another introduction request later." };
    }
  }
  if (input.outstanding >= input.settings.outstandingIntros) {
    return { ok: false, reason: "You have too many introduction requests waiting for an answer." };
  }
  const cap = introDailyCap(input);
  if (input.sentToday >= cap) return { ok: false, reason: "You have sent too many introduction requests today." };
  return { ok: true };
}

export function blocksEitherWay(rows: { blockerId: string; blockedId: string }[], a: string, b: string): boolean {
  return rows.some((row) => (row.blockerId === a && row.blockedId === b) || (row.blockerId === b && row.blockedId === a));
}

export type RestrictionRow = { kind: "MESSAGING_PAUSED" | "MESSAGING_SUSPENDED"; startsAt: Date; endsAt: Date | null };

export function activeMessagingRestriction(rows: RestrictionRow[], now: Date): RestrictionRow["kind"] | null {
  const open = rows.filter((row) => row.startsAt.getTime() <= now.getTime() && (!row.endsAt || row.endsAt.getTime() > now.getTime()));
  if (open.some((row) => row.kind === "MESSAGING_SUSPENDED")) return "MESSAGING_SUSPENDED";
  if (open.some((row) => row.kind === "MESSAGING_PAUSED")) return "MESSAGING_PAUSED";
  return null;
}

export function restrictionMessage(kind: RestrictionRow["kind"] | null): string | null {
  if (kind === "MESSAGING_SUSPENDED") return "Messaging is suspended.";
  if (kind === "MESSAGING_PAUSED") return "Messaging is paused.";
  return null;
}

/** A new thread opens after an introduction is accepted. An existing thread stays open. */
export function canStartThread(input: { hasConversation: boolean; introStatus: string | null }): { ok: true } | { ok: false; reason: string } {
  if (input.hasConversation) return { ok: true };
  if (input.introStatus === "ACCEPTED") return { ok: true };
  return { ok: false, reason: "Request an introduction first. Messaging opens after they accept." };
}

export function declineSenderNotice(): { title: string; body: string } {
  return { title: DECLINE_SENDER_LINE, body: DECLINE_SENDER_LINE };
}

export type EmailModeId = "INSTANT" | "THROTTLED" | "DIGEST" | "OFF";

export function threadEmailPlan(input: {
  isRequest: boolean;
  mode: EmailModeId;
  lastSentAt: Date | null;
  now: Date;
  windowMinutes: number;
  inboxUrl: string;
}): { deliver: "send" | "hold" | "digest" | "skip"; subject: string; text: string; suppressed: boolean; reason: string } {
  const request = input.isRequest
    ? {
        subject: "Introduction request on Private Floor",
        text: `You have an introduction request on Private Floor.\n\nOpen the directory\n${input.inboxUrl}\n`,
      }
    : {
        subject: "You have a new message on Private Floor",
        text: `You have a new message on Private Floor.\n\nOpen messages\n${input.inboxUrl}\n`,
      };
  if (input.mode === "OFF") {
    return { deliver: "skip", ...request, suppressed: true, reason: "Message email is off." };
  }
  if (input.isRequest || input.mode === "INSTANT" || !input.lastSentAt) {
    return { deliver: "send", ...request, suppressed: false, reason: "" };
  }
  if (input.mode === "DIGEST") {
    return {
      deliver: "digest",
      subject: "Message notice saved for the daily digest",
      text: "Saved for the daily digest. No message text is included.\n",
      suppressed: true,
      reason: "Saved for the daily digest.",
    };
  }
  const windowMs = input.windowMinutes * 60 * 1000;
  if (input.now.getTime() - input.lastSentAt.getTime() < windowMs) {
    return {
      deliver: "hold",
      subject: "Message notice held",
      text: "Held. One notice per thread is sent, then the next waits. No message text is included.\n",
      suppressed: true,
      reason: "Held. One notice per thread per window.",
    };
  }
  return { deliver: "send", ...request, suppressed: false, reason: "" };
}

export function digestNotice(inboxUrl: string): { subject: string; text: string } {
  return {
    subject: "Messages waiting on Private Floor",
    text: `You have messages waiting on Private Floor.\n\nOpen messages\n${inboxUrl}\n`,
  };
}

export function isReportCategory(value: string): value is ReportCategoryId {
  return (REPORT_CATEGORIES as readonly string[]).includes(value);
}

export function noticeHasMessageText(text: string, message: string): boolean {
  const sample = message.trim();
  if (sample.length < 3) return false;
  return text.includes(sample);
}
