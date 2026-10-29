import { APPLICATION_RECEIVED_TEMPLATE, REQUEST_RECEIVED_TEMPLATE } from "@/lib/applicant-copy";
import { DUES_SCHEDULE_SENTENCE } from "@/lib/dues";
import { JOIN_CTA, MEMBERSHIP_PHRASE } from "@/lib/membership-copy";

export const SIGN_OFF = "Richard Osika, Founder";

export const TEMPLATE_KEYS = [
  "info",
  "invite_received",
  "application_code",
  "application_thanks",
  "welcome",
  "needs_info",
  "approved",
  "declined",
  "payment_due",
  "dues_reminder",
  "renewal",
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type TemplateDef = {
  key: TemplateKey;
  name: string;
  subject: string;
  body: string;
};

const SIGN = `\n\n${SIGN_OFF}`;

export const TEMPLATE_DEFS: TemplateDef[] = [
  {
    key: "info",
    name: "Information",
    subject: "About Private Floor",
    body: `Hello {first_name},

${MEMBERSHIP_PHRASE}. Members are developers, general contractors, investors, family offices, lenders, brokers, and attorneys who want a private place to find the right people for a deal.

${JOIN_CTA}
{apply_link}

A Private Floor administrator reviews every request to join. The check uses public records. You will see Verified or Verification in progress. You will not see a score or a source list.

Referral code, optional: {referral_code}${SIGN}`,
  },
  {
    key: "invite_received",
    name: "Request to join received",
    subject: "Thank you for your request to join",
    body: `${REQUEST_RECEIVED_TEMPLATE}

Check your status
{status_link}

Richard Osika, Founder, Private Floor Club`,
  },
  {
    key: "application_code",
    name: "Email code",
    subject: "Your Private Floor code",
    body: `Your Private Floor code is {code}.

It expires in 15 minutes. Enter it on the application to continue.${SIGN}`,
  },
  {
    key: "application_thanks",
    name: "Thank you",
    subject: "We have your Private Floor application",
    body: `${APPLICATION_RECEIVED_TEMPLATE}

Your request is for the {role} role at {org}.

Follow it here
{status_link}${SIGN}`,
  },
  {
    key: "welcome",
    name: "Welcome",
    subject: "Welcome to Private Floor",
    body: `Hello {first_name},

Welcome to Private Floor. Your membership is active. ${MEMBERSHIP_PHRASE}. The first-week checklist is on the feed: your profile, the directory, the guidelines, a post, and an introduction.

Sign in
{login_link}

A Private Floor administrator is here if you need anything. Write to connect@privatefloorclub.com.

{note}${SIGN}`,
  },
  {
    key: "needs_info",
    name: "Needs more info",
    subject: "A note about your Private Floor application",
    body: `Hello {first_name},

Thank you for the application. A Private Floor administrator needs a little more before deciding.

{note}

Reply
{status_link}${SIGN}`,
  },
  {
    key: "approved",
    name: "Approved",
    subject: "You're approved to Private Floor",
    body: `Hello {first_name},

A Private Floor administrator approved your application. You are approved. Reviewed membership means every member is personally reviewed.

Sign in with the email and password you chose.

Sign in
{login_link}

View the decision
{status_link}

{note}${SIGN}`,
  },
  {
    key: "declined",
    name: "Declined",
    subject: "Your Private Floor application",
    body: `Hello {first_name},

Thank you for applying to Private Floor. A Private Floor administrator reviewed the application and is not able to offer membership at this time. We don't share the reasons for that decision.

See the status
{status_link}${SIGN}`,
  },
  {
    key: "payment_due",
    name: "Payment due",
    subject: "You're approved — membership dues are next",
    body: `Hello {first_name},

A Private Floor administrator approved your application. Membership for {role} is month to month. The first month is {intro_amount} (50% off). After that, the price is {dues_amount}. There is no long-term contract. Cancel anytime. A reminder goes out before the first full-price charge. Private Floor does not store a card number.

Your first full-price payment would be on {renewal_date}.

Pay membership dues
{payment_link}

Until the first month is recorded, the floor stays on the payment page.

Sign in
{login_link}

View the decision
{status_link}

{note}${SIGN}`,
  },
  {
    key: "dues_reminder",
    name: "Dues reminder",
    subject: "Your Private Floor dues still need attention",
    body: `Hello {first_name},

Your membership dues still need attention. The first month is {intro_amount} (50% off), then {dues_amount}. Month to month. No long-term contract. Cancel anytime. Next charge date: {renewal_date}. No card number is stored.

Pay membership dues
{payment_link}${SIGN}`,
  },
  {
    key: "renewal",
    name: "Renewal",
    subject: "Your full monthly price starts soon",
    body: `Hello {first_name},

Your first month was {intro_amount}, half of the monthly price. On {renewal_date} the charge is the full price, {dues_amount}. Membership is month to month. There is no long-term contract. Cancel anytime before that date and the full-price charge does not run.

Cancel anytime
{billing_link}

No card number is stored.${SIGN}`,
  },
];

export const TEMPLATE_VARIABLES = [
  "first_name",
  "full_name",
  "role",
  "org",
  "status_link",
  "payment_link",
  "login_link",
  "billing_link",
  "apply_link",
  "dues_amount",
  "intro_amount",
  "renewal_date",
  "note",
  "referral_code",
  "code",
] as const;

/** Unedited letters from before the annual-dues wording. An admin edit is left alone. */
export const TEMPLATE_PREVIOUS_BODIES: Partial<Record<TemplateKey, string | string[]>> = {
  info: [
    `Hello {first_name},

You're invited to Private Floor, the vetted circle for real estate deal teams. Members are developers, general contractors, investors, family offices, lenders, brokers, and attorneys who want a private place to find the right people for a deal.

A Private Floor administrator reviews every application. The check uses public records. You will see Verified or Verification in progress. You will not see a score or a source list.

Invite code: {invite_code}

Next step: open {apply_link} and enter that code when you are ready. After you submit, a Private Floor administrator reviews the file. Some roles have flat annual dues, and those are asked for only after approval. Nothing is charged on the application, and no fee is tied to a deal.${SIGN}`,
    `Hello {first_name},

You're invited to Private Floor, the vetted circle for real estate deal teams. Members are developers, general contractors, investors, family offices, lenders, brokers, and attorneys who want a private place to find the right people for a deal.

A Private Floor administrator reviews every application. The check uses public records. You will see Verified or Verification in progress. You will not see a score or a source list.

Invite code: {invite_code}

Next step: open {apply_link} and enter that code when you are ready. After you submit, a Private Floor administrator reviews the file. Some roles pay a flat annual fee, billed once a year and due only after approval. General contractors: $2,400 per year. Brokers: $1,800 per year. Attorneys and advisors: $1,200 per year. Developers, investors and LPs, family offices, and lenders are free. Nothing is charged on the application, and the fee is never based on a deal.${SIGN}`,
    `Hello {first_name},

${MEMBERSHIP_PHRASE}. Members are developers, general contractors, investors, family offices, lenders, brokers, and attorneys who want a private place to find the right people for a deal.

${JOIN_CTA}
{apply_link}

A Private Floor administrator reviews every application. The check uses public records. You will see Verified or Verification in progress. You will not see a score or a source list.

Code: {invite_code}

Some roles pay a flat annual fee, billed once a year and due only after approval. General contractors: $2,400 per year. Brokers: $1,800 per year. Attorneys and advisors: $1,200 per year. Developers, investors and LPs, family offices, and lenders are free. Nothing is charged on the application, and the fee is never based on a deal.${SIGN}`,
    `Hello {first_name},

${MEMBERSHIP_PHRASE}. Members are developers, general contractors, investors, family offices, lenders, brokers, and attorneys who want a private place to find the right people for a deal.

${JOIN_CTA}
{apply_link}

A Private Floor administrator reviews every application. The check uses public records. You will see Verified or Verification in progress. You will not see a score or a source list.

Code: {invite_code}

${DUES_SCHEDULE_SENTENCE} Nothing is charged on the application.${SIGN}`,
    `Hello {first_name},

${MEMBERSHIP_PHRASE}. Members are developers, general contractors, investors, family offices, lenders, brokers, and attorneys who want a private place to find the right people for a deal.

${JOIN_CTA}
{apply_link}

A Private Floor administrator reviews every application. The check uses public records. You will see Verified or Verification in progress. You will not see a score or a source list.

Referral code, optional: {invite_code}

${DUES_SCHEDULE_SENTENCE} Nothing is charged on the application.${SIGN}`,
    `Hello {first_name},

${MEMBERSHIP_PHRASE}. Members are developers, general contractors, investors, family offices, lenders, brokers, and attorneys who want a private place to find the right people for a deal.

${JOIN_CTA}
{apply_link}

A Private Floor administrator reviews every request to join. The check uses public records. You will see Verified or Verification in progress. You will not see a score or a source list.

Referral code, optional: {invite_code}${SIGN}`,
  ],
  invite_received: [
    `Hello {first_name},

Thank you for applying to Private Floor.

A Private Floor administrator reviews every application. You will hear from us by email.

Check your status
{status_link}

Richard Osika, Founder, Private Floor Club`,
    `${APPLICATION_RECEIVED_TEMPLATE}

Check your status
{status_link}

Richard Osika, Founder, Private Floor Club`,
  ],
  application_thanks: [
    `Hello {first_name},

Thank you. We have your Private Floor application for {role} at {org}.

A Private Floor administrator reviews every application personally. You can follow it here: {status_link}

Nothing is charged at this step. If your role has annual dues, they are a flat amount and they come only after approval.${SIGN}`,
    `Hello {first_name},

Thank you. We have your Private Floor application for {role} at {org}.

A Private Floor administrator reviews every application personally. You can follow it here: {status_link}

Nothing is charged at this step. If your role has annual dues, they are a flat fee, billed once a year, and due only after approval. General contractors: $2,400 per year. Brokers: $1,800 per year. Attorneys and advisors: $1,200 per year. Developers, investors and LPs, family offices, and lenders are free. The fee is never based on a deal.${SIGN}`,
    `${APPLICATION_RECEIVED_TEMPLATE}

It is for {role} at {org}. You can follow it here: {status_link}

Nothing is charged at this step. If your role has annual dues, they are a flat fee, billed once a year, and due only after approval. General contractors: $2,400 per year. Brokers: $1,800 per year. Attorneys and advisors: $1,200 per year. Developers, investors and LPs, family offices, and lenders are free. The fee is never based on a deal.${SIGN}`,
    `${APPLICATION_RECEIVED_TEMPLATE}

It is for {role} at {org}.

Follow it here
{status_link}

Nothing is charged at this step. If your role has annual dues, they are a flat fee, billed once a year, and due only after approval. General contractors: $2,400 per year. Brokers: $1,800 per year. Attorneys and advisors: $1,200 per year. Developers, investors and LPs, family offices, and lenders are free. The fee is never based on a deal.${SIGN}`,
    `${APPLICATION_RECEIVED_TEMPLATE}

It is for {role} at {org}.

Follow it here
{status_link}

Nothing is charged at this step. ${DUES_SCHEDULE_SENTENCE}${SIGN}`,
    `${APPLICATION_RECEIVED_TEMPLATE}

Your request is for the {role} role at {org}.

Follow it here
{status_link}

Nothing is charged at this step. ${DUES_SCHEDULE_SENTENCE}${SIGN}`,
  ],
  welcome: [
    `Hello {first_name},

Welcome to Private Floor. Your membership is active. Sign in at {login_link}. The first-week checklist is on the feed: your profile, the directory, the guidelines, a post, and an introduction.

A Private Floor administrator is here if you need anything. Write to connect@privatefloorclub.com.${SIGN}`,
    `Hello {first_name},

Welcome to Private Floor. Your membership is active. The first-week checklist is on the feed: your profile, the directory, the guidelines, a post, and an introduction.

Sign in
{login_link}

A Private Floor administrator is here if you need anything. Write to connect@privatefloorclub.com.${SIGN}`,
  ],
  needs_info: `Hello {first_name},

Thank you for the application. A Private Floor administrator needs a little more before deciding.

{note}

Reply on this page: {status_link}${SIGN}`,
  approved: [
    `Hello {first_name},

A Private Floor administrator approved your application. You are an Invited member, and this role has no annual dues.

Sign in at {login_link} with the email and password you chose. The decision is also here: {status_link}

{note}${SIGN}`,
    `Hello {first_name},

A Private Floor administrator approved your application. You are an Invited member. This role has no annual dues. Developers, investors and LPs, family offices, and lenders are free.

Sign in at {login_link} with the email and password you chose. The decision is also here: {status_link}

{note}${SIGN}`,
    `Hello {first_name},

A Private Floor administrator approved your application. You are approved. Reviewed membership means every member is personally reviewed. This role has no annual dues. Developers, investors and LPs, family offices, and lenders are free.

Sign in at {login_link} with the email and password you chose. The decision is also here: {status_link}

{note}${SIGN}`,
    `Hello {first_name},

A Private Floor administrator approved your application. You are approved. Reviewed membership means every member is personally reviewed. This role has no annual dues. Developers, investors and LPs, family offices, and lenders are free.

Sign in with the email and password you chose.

Sign in
{login_link}

View the decision
{status_link}

{note}${SIGN}`,
    `Hello {first_name},

A Private Floor administrator approved your application. You are approved. Reviewed membership means every member is personally reviewed. This role has no monthly dues. Developers, investors and LPs, family offices, and lenders are free.

Sign in with the email and password you chose.

Sign in
{login_link}

View the decision
{status_link}

{note}${SIGN}`,
  ],
  declined: `Hello {first_name},

Thank you for applying to Private Floor. A Private Floor administrator reviewed the application and is not able to offer membership at this time. We don't share the reasons for that decision.

You can see the status here: {status_link}${SIGN}`,
  payment_due: [
    `Hello {first_name},

A Private Floor administrator approved your application. Annual dues for {role} are {dues_amount}. That amount is a flat membership fee. It is never based on a deal, and Private Floor does not store a card number.

Pay here: {payment_link}

You can also sign in at {login_link}. Until the dues are recorded, the floor stays on the payment page.

The decision is here: {status_link}

{note}${SIGN}`,
    `Hello {first_name},

A Private Floor administrator approved your application. Annual dues for {role} are {dues_amount}. They are a flat fee, billed once a year, and due only after approval. They are never based on a deal, and Private Floor does not store a card number.

Renewal date: {renewal_date}.

Pay here: {payment_link}

You can also sign in at {login_link}. Until the annual dues are recorded, the floor stays on the payment page.

The decision is here: {status_link}

{note}${SIGN}`,
    `Hello {first_name},

A Private Floor administrator approved your application. Annual dues for {role} are {dues_amount}. They are a flat fee, billed once a year, and due only after approval. They are never based on a deal, and Private Floor does not store a card number.

Renewal date: {renewal_date}.

Pay annual dues
{payment_link}

Until the annual dues are recorded, the floor stays on the payment page.

Sign in
{login_link}

View the decision
{status_link}

{note}${SIGN}`,
    `Hello {first_name},

A Private Floor administrator approved your application. Membership for {role} is month to month. The first month is {intro_amount} (50% off). After that, the price is {dues_amount}. There is no long-term contract. Cancel anytime. A reminder goes out before the first full-price charge. The fee is never based on a deal, and Private Floor does not store a card number.

Next charge date: {renewal_date}.

Pay membership dues
{payment_link}

Until the first month is recorded, the floor stays on the payment page.

Sign in
{login_link}

View the decision
{status_link}

{note}${SIGN}`,
    `Hello {first_name},

A Private Floor administrator approved your application. Membership for {role} is month to month. The first month is {intro_amount} (50% off). After that, the price is {dues_amount}. There is no long-term contract. Cancel anytime. A reminder goes out before the first full-price charge. The fee is never based on a deal, and Private Floor does not store a card number.

Your first full-price payment would be on {renewal_date}.

Pay membership dues
{payment_link}

Until the first month is recorded, the floor stays on the payment page.

Sign in
{login_link}

View the decision
{status_link}

{note}${SIGN}`,
  ],
  dues_reminder: [
    `Hello {first_name},

Your Private Floor dues of {dues_amount} still need attention. No card number is stored. You can try again here: {payment_link}

The fee stays flat and is not tied to a deal.${SIGN}`,
    `Hello {first_name},

Your annual dues of {dues_amount} still need attention. They are billed once a year. Renewal date: {renewal_date}. No card number is stored. You can try again here: {payment_link}

The fee stays flat and is never based on a deal.${SIGN}`,
    `Hello {first_name},

Your annual dues of {dues_amount} still need attention. They are billed once a year. Renewal date: {renewal_date}. No card number is stored.

Pay annual dues
{payment_link}

The fee stays flat and is never based on a deal.${SIGN}`,
    `Hello {first_name},

Your membership dues still need attention. The first month is {intro_amount} (50% off), then {dues_amount}. Month to month. No long-term contract. Cancel anytime. Next charge date: {renewal_date}. No card number is stored.

Pay membership dues
{payment_link}

The fee stays flat and is never based on a deal.${SIGN}`,
  ],
  renewal: [
    `Hello {first_name},

Your flat annual dues of {dues_amount} renew on {renewal_date}. This is not a deal fee. Write to connect@privatefloorclub.com if you want to cancel before that date.

Billing: {billing_link}${SIGN}`,
    `Hello {first_name},

Your flat annual dues of {dues_amount} renew on {renewal_date}. They are billed once a year and are never based on a deal. Write to connect@privatefloorclub.com if you want to cancel before that date.

Billing: {billing_link}${SIGN}`,
    `Hello {first_name},

Your first month was {intro_amount}, half of the monthly price. On {renewal_date} the charge is the full price, {dues_amount}. Membership is month to month. There is no long-term contract. Cancel anytime before that date and the full-price charge does not run.

Cancel anytime
{billing_link}

The fee is flat and is never based on a deal. No card number is stored.${SIGN}`,
  ],
};

const PREVIOUS_SUBJECTS: Partial<Record<TemplateKey, string[]>> = {
  approved: ["You're invited to Private Floor", "You're approved for Private Floor"],
  info: ["You're invited to Private Floor"],
  payment_due: ["You're approved — annual dues are next"],
  invite_received: ["Thank you for applying to Private Floor"],
};

/** True when a stored subject is an older default that should be replaced. */
export function staleTemplateSubject(key: string, subject: string): boolean {
  if (!isTemplateKey(key)) return false;
  return (PREVIOUS_SUBJECTS[key] ?? []).includes(subject);
}

/** The new default body when the stored letter is still the previous default. */
export function replacementTemplateBody(key: string, current: string): string | null {
  if (!isTemplateKey(key)) return null;
  const previous = TEMPLATE_PREVIOUS_BODIES[key];
  const next = templateDef(key);
  const known = previous == null ? [] : Array.isArray(previous) ? previous : [previous];
  if (!next || !known.includes(current) || current === next.body) return null;
  return next.body;
}

export function isTemplateKey(value: string): value is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(value);
}

export function templateDef(key: string): TemplateDef | undefined {
  return TEMPLATE_DEFS.find((item) => item.key === key);
}

export function firstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "there";
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(" ");
}

/** Drops a label whose token rendered empty, such as "The decision is here:" with no link. */
export function dropEmptyLabelLines(source: string): string {
  return source
    .split("\n")
    .filter((line) => !/^[^:\n]{0,80}:\s*$/.test(line.trim()))
    .join("\n");
}

/**
 * "CBRE Group, Inc." already ends a sentence. A following period would read "Inc..".
 * An ellipsis ("...") is left as written.
 */
export function repairDoubledTerminalPeriod(text: string): string {
  return text.replace(/(\p{L})\.\.(?!\.)/gu, "$1.");
}

/** `{referral_code}` is the admin name. `{invite_code}` still fills from the same value. */
function templateTokenValue(vars: Record<string, string>, key: string): string | undefined {
  const name = key.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(vars, name)) return vars[name];
  if (name === "referral_code" && Object.prototype.hasOwnProperty.call(vars, "invite_code")) return vars.invite_code;
  if (name === "invite_code" && Object.prototype.hasOwnProperty.call(vars, "referral_code")) return vars.referral_code;
  return undefined;
}

/** Replaces {tokens}. Unknown tokens stay so a typo is visible. The founder sign-off is for bodies, not subjects. */
export function renderTemplate(source: string, vars: Record<string, string>, options?: { signOff?: boolean }): string {
  const rendered = repairDoubledTerminalPeriod(
    source.replace(/\{([a-z0-9_]+)\}/gi, (match, key: string) => {
      const value = templateTokenValue(vars, key);
      return value === undefined ? match : value;
    }),
  );
  const trimmed = dropEmptyLabelLines(rendered).trim();
  if (options?.signOff === false) return trimmed;
  if (trimmed.includes(SIGN_OFF)) return trimmed;
  return `${trimmed}\n\n${SIGN_OFF}`;
}

export function sampleTemplateVars(): Record<string, string> {
  return {
    first_name: "Alex",
    full_name: "Alex Rivera",
    role: "General Contractor",
    org: "Northline Builders",
    status_link: "https://cornicio-mvp.onrender.com/request-status/preview",
    payment_link: "https://cornicio-mvp.onrender.com/pay/preview",
    login_link: "https://cornicio-mvp.onrender.com/login",
    billing_link: "https://cornicio-mvp.onrender.com/settings",
    apply_link: "https://cornicio-mvp.onrender.com/apply",
    dues_amount: "$199 per month",
    intro_amount: "$99.50",
    renewal_date: "2026-11-24",
    note: "A short note from the administrator.",
    referral_code: "PF-PREVIEW",
    invite_code: "PF-PREVIEW",
    code: "1234",
  };
}

/** This build never switches the recipient. Live mode is stored for later and still uses the Outbox. */
export function deliveryTarget(mode: string, testRecipient: string): { to: string; via: "outbox"; mode: "outbox" | "live" } {
  return { to: testRecipient, via: "outbox", mode: mode === "live" ? "live" : "outbox" };
}

export function shouldSuppressSend(person: { doNotContact: boolean } | null): boolean {
  return Boolean(person?.doNotContact);
}
