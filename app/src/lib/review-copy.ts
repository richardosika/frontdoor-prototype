/** Display-only wording for stored review text. Scoring strings stay where they are generated. */
export function reviewCopy(text: string): string {
  return text
    .replaceAll("No invite code was stored on this file.", "No referral code was stored on this request.")
    .replaceAll("Invite source came back without a usable match", "The request source came back without a usable match")
    .replaceAll("They came in through invite ", "They came in through referral ");
}
