export const GENERIC_SIGN_IN_ERROR = "Those credentials were not recognized.";
export const PENDING_APPROVAL_ERROR = "Your application is pending approval. You can sign in after the committee approves it.";
export const INACTIVE_ACCOUNT_ERROR = "This account is not active. Contact the committee if you need help.";

/**
 * Pending approval is mentioned only after the password matches a pending application.
 * A wrong password, or an email with no matching password, always gets the generic error.
 * Returns null when the member password matches an active account and sign-in should proceed.
 */
export function signInFailureCopy(input: {
  memberFound: boolean;
  memberPasswordMatches: boolean;
  memberActive: boolean;
  pendingApplicationPasswordMatches: boolean;
}): string | null {
  if (input.memberFound && input.memberPasswordMatches && input.memberActive) return null;
  if (input.memberFound && input.memberPasswordMatches && !input.memberActive) return INACTIVE_ACCOUNT_ERROR;
  if (!input.memberFound && input.pendingApplicationPasswordMatches) return PENDING_APPROVAL_ERROR;
  return GENERIC_SIGN_IN_ERROR;
}
