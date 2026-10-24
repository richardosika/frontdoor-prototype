export const SIGN_OFF = "Richard Osika, Founder";

export const TEMPLATE_KEYS = [
  "info",
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
    subject: "You're invited to Private Floor",
    body: `Hello {first_name},

You're invited to Private Floor, the vetted circle for real estate deal teams. Members are developers, general contractors, investors, family offices, lenders, brokers, and attorneys who want a private place to find the right people for a deal.

A Private Floor administrator reviews every application. The check uses public records. You will see Verified or Verification in progress. You will not see a score or a source list.

Invite code: {invite_code}

Next step: open {apply_link} and enter that code when you are ready. After you submit, a Private Floor administrator reviews the file. Some roles have flat annual dues, and those are asked for only after approval. Nothing is charged on the application, and no fee is tied to a deal.${SIGN}`,
  },
  {
    key: "application_thanks",
    name: "Thank you",
    subject: "We have your Private Floor application",
    body: `Hello {first_name},

Thank you. We have your Private Floor application for {role} at {org}.

A Private Floor administrator reviews every application personally. You can follow it here: {status_link}

Nothing is charged at this step. If your role has annual dues, they are a flat amount and they come only after approval.${SIGN}`,
  },
  {
    key: "welcome",
    name: "Welcome",
    subject: "Welcome to Private Floor",
    body: `Hello {first_name},

Welcome to Private Floor. Your membership is active. Sign in at {login_link}. The first-week checklist is on the feed: your profile, the directory, the guidelines, a post, and an introduction.

A Private Floor administrator is here if you need anything. Write to connect@privatefloorclub.com.${SIGN}`,
  },
  {
    key: "needs_info",
    name: "Needs more info",
    subject: "A note about your Private Floor application",
    body: `Hello {first_name},

Thank you for the application. A Private Floor administrator needs a little more before deciding.

{note}

Reply on this page: {status_link}${SIGN}`,
  },
  {
    key: "approved",
    name: "Approved",
    subject: "You're approved for Private Floor",
    body: `Hello {first_name},

A Private Floor administrator approved your application. You are an Invited member, and this role has no annual dues.

Sign in at {login_link} with the email and password you chose. The decision is also here: {status_link}

{note}${SIGN}`,
  },
  {
    key: "declined",
    name: "Declined",
    subject: "Your Private Floor application",
    body: `Hello {first_name},

Thank you for applying to Private Floor. A Private Floor administrator reviewed the application and is not able to offer membership at this time. We don't share the reasons for that decision.

You can see the status here: {status_link}${SIGN}`,
  },
  {
    key: "payment_due",
    name: "Payment due",
    subject: "You're approved — annual dues are next",
    body: `Hello {first_name},

A Private Floor administrator approved your application. Annual dues for {role} are {dues_amount}. That amount is a flat membership fee. It is never based on a deal, and Private Floor does not store a card number.

Pay here: {payment_link}

You can also sign in at {login_link}. Until the dues are recorded, the floor stays on the payment page.

The decision is here: {status_link}

{note}${SIGN}`,
  },
  {
    key: "dues_reminder",
    name: "Dues reminder",
    subject: "Your Private Floor dues still need attention",
    body: `Hello {first_name},

Your Private Floor dues of {dues_amount} still need attention. No card number is stored. You can try again here: {payment_link}

The fee stays flat and is not tied to a deal.${SIGN}`,
  },
  {
    key: "renewal",
    name: "Renewal",
    subject: "Your Private Floor dues renew soon",
    body: `Hello {first_name},

Your flat annual dues of {dues_amount} renew on {renewal_date}. This is not a deal fee. Write to connect@privatefloorclub.com if you want to cancel before that date.

Billing: {billing_link}${SIGN}`,
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
  "renewal_date",
  "note",
  "invite_code",
] as const;

export function isTemplateKey(value: string): value is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(value);
}

export function templateDef(key: string): TemplateDef | undefined {
  return TEMPLATE_DEFS.find((item) => item.key === key);
}

export function firstName(fullName: string): string {
  const token = fullName.trim().split(/\s+/)[0];
  return token || "there";
}

/** Replaces {tokens}. Unknown tokens stay so a typo is visible. Adds the founder sign-off when the body does not already include it. */
export function renderTemplate(source: string, vars: Record<string, string>): string {
  const rendered = source.replace(/\{([a-z0-9_]+)\}/gi, (match, key: string) => {
    const value = vars[key.toLowerCase()];
    return value === undefined ? match : value;
  });
  const trimmed = rendered.trim();
  if (trimmed.includes(SIGN_OFF)) return trimmed;
  return `${trimmed}\n\n${SIGN_OFF}`;
}

export function sampleTemplateVars(): Record<string, string> {
  return {
    first_name: "Alex",
    full_name: "Alex Rivera",
    role: "General Contractor",
    org: "Northline Builders",
    status_link: "https://cornicio-mvp.onrender.com/apply/status/preview",
    payment_link: "https://cornicio-mvp.onrender.com/pay/preview",
    login_link: "https://cornicio-mvp.onrender.com/login",
    billing_link: "https://cornicio-mvp.onrender.com/settings",
    apply_link: "https://cornicio-mvp.onrender.com/apply",
    dues_amount: "$2,400 a year",
    renewal_date: "2027-10-24",
    note: "A short note from the administrator.",
    invite_code: "PF-PREVIEW",
  };
}

/** This build never switches the recipient. Live mode is stored for later and still uses the Outbox. */
export function deliveryTarget(mode: string, testRecipient: string): { to: string; via: "outbox"; mode: "outbox" | "live" } {
  return { to: testRecipient, via: "outbox", mode: mode === "live" ? "live" : "outbox" };
}

export function shouldSuppressSend(person: { doNotContact: boolean } | null): boolean {
  return Boolean(person?.doNotContact);
}
