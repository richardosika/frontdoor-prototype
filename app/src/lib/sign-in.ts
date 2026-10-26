import { isDemoRecord } from "@/lib/person-standing";

export const GENERIC_SIGN_IN_ERROR = "Those credentials were not recognized.";

/** Member sign-in accepts members. Administrator sign-in accepts administrators. Anything else is the generic error. */
export function credentialsPortalAllowed(isAdmin: boolean, portal: unknown): boolean {
  return (portal === "admin") === isAdmin;
}

/** Demo and sample accounts stay on the member side, even if an older seed marked them as administrators. */
export function adminSignInAllowed(
  user: { isAdmin: boolean; isTest?: boolean | null; email?: string | null } | null | undefined,
): boolean {
  if (!user?.isAdmin) return false;
  return !isDemoRecord({ isTest: user.isTest, email: user.email });
}
export const PENDING_APPROVAL_ERROR = "Your application is under review. You can sign in after Richard Osika approves it.";
export const DECLINED_APPLICATION_ERROR = "This application was not approved.";
export const INACTIVE_ACCOUNT_ERROR = "This account is not active. Contact connect@privatefloorclub.com if you need help.";

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
  declinedApplicationPasswordMatches?: boolean;
}): string | null {
  if (input.memberFound && input.memberPasswordMatches && input.memberActive) return null;
  if (input.memberFound && input.memberPasswordMatches && !input.memberActive) return INACTIVE_ACCOUNT_ERROR;
  if (!input.memberFound && input.declinedApplicationPasswordMatches) return DECLINED_APPLICATION_ERROR;
  if (!input.memberFound && input.pendingApplicationPasswordMatches) return PENDING_APPROVAL_ERROR;
  return GENERIC_SIGN_IN_ERROR;
}
