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
  return knownRoleCopy(shown, role);
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
