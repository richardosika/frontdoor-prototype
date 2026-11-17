import { EXPIRED_WEEKS, INSURANCE_TIME_ZONE, insurancePolicyLabel } from "@/lib/insurance-compliance";
import { isLocale } from "@/lib/i18n/messages";
import { phrase } from "@/lib/i18n/phrases";

export const INSURANCE_TEMPLATE_KEY = "insurance_expiring_30";
export const INSURANCE_EXPIRED_TEMPLATE_KEY = "insurance_expired_weekly";
export const INSURANCE_SUSPENDED_TEMPLATE_KEY = "insurance_suspended";

type Base = { locale: string; type: string; otherName: string; expiresOn: Date; link: string; name?: string };

function frame(input: Base) {
  const locale = isLocale(input.locale) ? input.locale : "en";
  const tx = (text: string) => phrase(locale, text);
  const policy = insurancePolicyLabel(input.type, input.otherName, tx);
  const day = (value: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: INSURANCE_TIME_ZONE }).format(value);
  const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (all, key) => values[key] ?? all);
  const wrap = (title: string, paragraphs: string[]) => ({
    title,
    body: paragraphs.join(" "),
    subject: `Private Floor · ${title}`,
    text: [
      (input.name ?? "").trim() ? tx("Hi {name},").replace("{name}", (input.name ?? "").trim().split(/\s+/)[0]) : tx("Hello,"),
      "",
      ...paragraphs.flatMap((paragraph) => [paragraph, ""]),
      tx("Open your profile"),
      input.link,
      "",
      tx("Thank you,"),
      tx("The Private Floor team"),
      "",
    ].join("\n"),
  });
  return { tx, policy, day, fill, wrap };
}

export function insuranceExpiringEmail(input: Base) {
  const { tx, policy, day, fill, wrap } = frame(input);
  return wrap(tx("Insurance policy expiration reminder"), [
    fill(tx("Your {policy} policy expires on {date}. Please update your insurance details once you renew."), { policy, date: day(input.expiresOn) }),
  ]);
}

/** Nov 17 (Richard, decision 4): weekly reminders 1 to 4 after a policy expires, each naming the suspension date. */
export function insuranceExpiredEmail(input: Base & { week: number; suspendOn: Date }) {
  const { tx, policy, day, fill, wrap } = frame(input);
  const final = input.week >= EXPIRED_WEEKS;
  return wrap(fill(tx("Insurance policy expired: reminder {week} of {total}"), { week: String(input.week), total: String(EXPIRED_WEEKS) }), [
    fill(tx("Your {policy} policy expired on {date}. Please add the renewed policy and its new expiration date on your Profile."), { policy, date: day(input.expiresOn) }),
    fill(tx(final
      ? "This is the final reminder. If the policy is not updated, your account will be suspended on {suspendOn}."
      : "If the policy is not updated, your account will be suspended on {suspendOn}."), { suspendOn: day(input.suspendOn) }),
  ]);
}

export function insuranceSuspendedEmail(input: Base) {
  const { tx, policy, day, fill, wrap } = frame(input);
  return wrap(tx("Your account is suspended until your insurance is updated"), [
    fill(tx("Your account is suspended because your {policy} policy expired on {date} and was not updated after four weekly reminders."), { policy, date: day(input.expiresOn) }),
    tx("You can still sign in. Add the current policy on your Profile and access is restored right away."),
  ]);
}
