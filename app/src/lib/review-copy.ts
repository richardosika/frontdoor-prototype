import { roleLabel } from "@/lib/roles";

/** Display-only wording for stored review text. Scoring strings stay where they are generated. */
export function reviewCopy(text: string, role?: string | null): string {
  const shown = text
    .replaceAll("No invite code was stored on this file.", "No referral code was stored on this request.")
    .replaceAll("An invite code is on the file", "A referral code is on the file")
    .replaceAll("No invite source was confirmed", "No referral source was confirmed")
    .replaceAll(
      "No invite note was stored, so the sponsoring member is not named here.",
      "No referral note was stored, so the sponsoring member is not named here.",
    )
    .replaceAll("Invite source came back without a usable match", "The request source came back without a usable match")
    .replaceAll("Invite source", "Referral source")
    .replaceAll("Invite code", "Referral code")
    .replaceAll("invite source", "referral source")
    .replaceAll("invite-source", "referral")
    .replaceAll("They came in through invite ", "They came in through referral ");
  return knownRoleCopy(scrubInviteWording(shown), role);
}

/** Leftover invite phrases, including a different capitalization or an old status link. */
function scrubInviteWording(text: string): string {
  return text
    .replace(/no invite source was confirmed/gi, "No referral source was confirmed")
    .replace(/no invite note was stored/gi, "No referral note was stored")
    .replace(/an invite code is on the file/gi, "A referral code is on the file")
    .replace(/invite codes?/gi, "referral code")
    .replace(/invite sources?/gi, "referral source")
    .replace(/invite notes?/gi, "referral note")
    .replace(/\/invite-status\b/gi, "/request-status")
    .replace(/\/apply\/status\b/gi, "/request-status");
}

/** Subject and body shown in the outbox and stored on a new notice. */
export function reviewNotice(text: string, role?: string | null): string {
  return reviewCopy(text, role);
}

const NOTICE_LABELS: Record<string, string> = {
  info: "Information email",
  invite_received: "Request to join received",
  request_received: "Request to join received",
  application_code: "Email code",
  application_thanks: "Application received email",
  welcome: "Welcome email",
  needs_info: "Needs more info email",
  approved: "Approved email",
  declined: "Declined email",
  payment_due: "Payment due email",
  dues_reminder: "Dues reminder email",
  renewal: "Renewal email",
  payment_failed: "Payment failed email",
  admin_decision: "Decision email",
  notice: "Email",
};

/** The stored template key stays put. Screens show this name. */
export function reviewTemplateKey(key: string): string {
  if (NOTICE_LABELS[key]) return NOTICE_LABELS[key];
  if (/^[a-z0-9_]+$/.test(key)) {
    const words = key.replace(/_/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  return key;
}

/** Timeline text for a stored CRM event. Old rows still start with the raw template key. */
export function crmEventDisplay(kind: string, summary: string): { label: string; detail: string } {
  if (kind === "email" || kind === "suppressed") {
    const splitAt = summary.indexOf(" · ");
    const head = (splitAt === -1 ? summary : summary.slice(0, splitAt)).trim();
    const rest = splitAt === -1 ? "" : summary.slice(splitAt + 3).trim();
    const label = reviewTemplateKey(head);
    if (kind === "suppressed" && !rest) return { label: "Not sent", detail: summary };
    return { label, detail: rest };
  }
  return { label: "", detail: summary };
}

/** The check table prints the stored key. Show referral wording without changing the stored key. */
export function reviewCheckKey(key: string): string {
  return key === "invite-source" ? "referral" : key;
}

/** Stored home-form grades defaulted the sentence to Developer. Show the role on the file. */
export function knownRoleCopy(text: string, role?: string | null): string {
  if (!role || role === "DEVELOPER" || role === "Developer") return text;
  const label = roleLabel(role);
  if (!label || label === "Developer" || label === "Member") return text;
  return text.replaceAll("applied as a Developer", `applied as a ${label}`);
}
