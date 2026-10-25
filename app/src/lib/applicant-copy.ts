import { BRAND } from "@/lib/brand";

export const LANDING_INTRO = `The ${BRAND.club} is nationwide and invite-only. A Private Floor administrator reviews every application.`;

export const APPLY_ENCOURAGEMENT =
  "The more detail you share, the better we can match you with the right members and deals.";

export const INVITE_REQUEST_THANKS_TITLE = "Thank you for applying";

export const INVITE_REQUEST_THANKS_BODY =
  "A Private Floor administrator reviews every application. You will hear from us by email.";

export const INVITE_STATUS_COPY = {
  PENDING: {
    title: "Application received",
    body: "Thank you. A Private Floor administrator reviews every application. You will hear from us by email.",
  },
  ISSUED: {
    title: "Your invite is on its way",
    body: "Thank you. A Private Floor administrator will send your invite code by email. This page does not show the code.",
  },
  DECLINED: {
    title: "Thank you for applying",
    body: "A Private Floor administrator reviewed your request and is not able to offer an invite at this time. We appreciate you writing to us.",
  },
} as const;
