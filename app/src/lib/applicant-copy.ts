import { JOIN_COMPANION, MEMBERSHIP_PHRASE } from "@/lib/membership-copy";

export const LANDING_INTRO = `${MEMBERSHIP_PHRASE}. ${JOIN_COMPANION}`;

export const APPLY_ENCOURAGEMENT =
  "The more detail you share, the better we can match you with the right members and deals.";

export const INVITE_REQUEST_THANKS_TITLE = "Thank you for applying";

/** Shared by the receipt email and the Application received screen. */
export const APPLICATION_RECEIVED_TEMPLATE =
  "Thank you, {first_name}. We've got your application. A member of the Private Floor team will personally review it, usually within a few days. We'll email you as soon as there's news. We're glad you want to be part of this.";

export function applicationReceivedMessage(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] || "there";
  return APPLICATION_RECEIVED_TEMPLATE.replaceAll("{first_name}", first);
}

export const INVITE_STATUS_COPY = {
  PENDING: {
    title: "Application received",
    body: APPLICATION_RECEIVED_TEMPLATE,
  },
  ISSUED: {
    title: "Your request is with Private Floor",
    body: "Thank you. A Private Floor administrator will email you about the next step. This page does not show a code.",
  },
  DECLINED: {
    title: "Thank you for applying",
    body: "A Private Floor administrator reviewed your request and is not able to offer membership at this time. We appreciate you writing to us.",
  },
} as const;
