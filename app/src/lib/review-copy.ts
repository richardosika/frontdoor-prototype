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

/** The stored template key stays put. The outbox label uses the current name. */
export function reviewTemplateKey(key: string): string {
  return key === "invite_received" ? "request_received" : key;
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
