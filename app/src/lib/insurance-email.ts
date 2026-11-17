import { INSURANCE_TIME_ZONE, insurancePolicyLabel } from "@/lib/insurance-compliance";
import { isLocale } from "@/lib/i18n/messages";
import { phrase } from "@/lib/i18n/phrases";

export const INSURANCE_TEMPLATE_KEY = "insurance_expiring_30";

export function insuranceExpiringEmail(input: {
  locale: string; type: string; otherName: string; expiresOn: Date; link: string; name?: string;
}) {
  const locale = isLocale(input.locale) ? input.locale : "en";
  const tx = (text: string) => phrase(locale, text);
  const policy = insurancePolicyLabel(input.type, input.otherName, tx);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: INSURANCE_TIME_ZONE }).format(input.expiresOn);
  const title = tx("Insurance policy expiration reminder");
  const body = tx("Your {policy} policy expires on {date}. Please update your insurance details once you renew.")
    .replace(/\{(policy|date)\}/g, (_, key) => key === "policy" ? policy : date);
  return {
    title, body,
    subject: `Private Floor · ${title}`,
    text: [
      (input.name ?? "").trim() ? tx("Hi {name},").replace("{name}", (input.name ?? "").trim().split(/\s+/)[0]) : tx("Hello,"),
      "",
      body,
      "",
      tx("Open your profile"),
      input.link,
      "",
      tx("Thank you,"),
      tx("The Private Floor team"),
      "",
    ].join("\n"),
  };
}
