import { JOIN_COMPANION, MEMBERSHIP_PHRASE } from "@/lib/membership-copy";

export const LANDING_INTRO = `${MEMBERSHIP_PHRASE}. ${JOIN_COMPANION}`;

export const APPLY_ENCOURAGEMENT =
  "The more detail you share, the better we can match you with the right members and deals.";

export const INVITE_REQUEST_THANKS_TITLE = "Thank you for your request to join";

/** Shared by the receipt email and the Application received screen. */
export const APPLICATION_RECEIVED_TEMPLATE =
  "Thank you, {first_name}. We've got your application. A member of the Private Floor team will personally review it, usually within a few days. We'll email you as soon as there's news. We're glad you want to be part of this.";

/** A request to join has no application yet. */
export const REQUEST_RECEIVED_TEMPLATE = `Thank you, {first_name}. We've got your request to join. ${MEMBERSHIP_PHRASE}. A member of the Private Floor team will personally review it, usually within a few days. We'll email you as soon as there's news.`;

function greeting(givenName: string): string {
  return givenName.replace(/\s+/g, " ").trim() || "there";
}

export function applicationReceivedMessage(givenName: string): string {
  return APPLICATION_RECEIVED_TEMPLATE.replaceAll("{first_name}", greeting(givenName));
}

export function requestReceivedMessage(givenName: string): string {
  return REQUEST_RECEIVED_TEMPLATE.replaceAll("{first_name}", greeting(givenName));
}

export const INVITE_STATUS_COPY = {
  PENDING: {
    title: "Request received",
    body: REQUEST_RECEIVED_TEMPLATE,
  },
  ISSUED: {
    title: "Your request is with Private Floor",
    body: "Thank you. A Private Floor administrator will email you about the next step. This page does not show a code.",
  },
  DECLINED: {
    title: "Thank you for your request to join",
    body: "A Private Floor administrator reviewed your request and is not able to offer membership at this time. We appreciate you writing to us.",
  },
} as const;
