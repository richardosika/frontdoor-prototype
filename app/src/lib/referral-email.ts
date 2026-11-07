import { brandedNoticeHtml } from "@/lib/email-layout";
import type { Locale } from "@/lib/i18n/messages";
import { phrase } from "@/lib/i18n/phrases";
import { roleLabel } from "@/lib/roles";

export const REFERRAL_SUBJECT = "{name} referred you to Private Floor";
export const REFERRAL_LINE = "{name} ({role}) referred you to Private Floor.";
export const REFERRAL_NOTE = "A note from {name}:";

/** The member's public name. Richard's account always shows as "Richard Osika". */
export function referrerPublicName(name: string, isOwner = false): string {
  if (isOwner) return "Richard Osika";
  return name.trim();
}

export function referralJoinLink(base: string, code: string): string {
  return `${base.replace(/\/$/, "")}/join?code=${encodeURIComponent(code)}`;
}

/**
 * Email to the person a member refers from "Refer a colleague" on the Ledger.
 * Written in the recipient's language when known, otherwise the referrer's. Plain text plus the branded HTML layout.
 */
export function referralEmail(input: {
  locale: Locale;
  recipientFirstName: string;
  referrerName: string;
  referrerRole: string;
  code: string;
  base: string;
  note?: string;
}): { subject: string; text: string; html: string; previewText: string } {
  const p = (text: string) => phrase(input.locale, text);
  const role = p(roleLabel(input.referrerRole));
  const link = referralJoinLink(input.base, input.code);
  const fill = (text: string) => p(text).replace("{name}", input.referrerName).replace("{role}", role);
  const subject = fill(REFERRAL_SUBJECT);
  const note = input.note?.trim().slice(0, 600) ?? "";
  const lines = [
    input.recipientFirstName ? `${p("Hello")} ${input.recipientFirstName},` : `${p("Hello")},`,
    fill(REFERRAL_LINE),
    note ? `${fill(REFERRAL_NOTE)} “${note}”` : "",
    p("Private Floor is a nationwide network for real-estate deal teams: developers, general contractors, investors, family offices, lenders, brokers, and attorneys. Every member is personally reviewed."),
    p("Your referral code"),
    `[[code:${input.code}]]`,
    `${p("Apply")} ${link}`,
    p("Your code is already filled in on the application. A referral does not skip review: every application is personally reviewed before membership is approved."),
    "Richard Osika, Founder",
  ].filter(Boolean);
  const text = lines.join("\n\n");
  const plain = text.replace(`[[code:${input.code}]]`, input.code).replace(`${p("Apply")} ${link}`, `${p("Apply")}: ${link}`);
  return {
    subject,
    text: plain,
    previewText: subject,
    html: brandedNoticeHtml({ text, headline: p("You have been referred"), logoUrl: `${input.base.replace(/\/$/, "")}/email-assets/lockup.png`, lang: input.locale }),
  };
}
