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

export function adminLoginDecision(input: {
  user: { isAdmin: boolean; isTest?: boolean | null; email?: string | null; status?: string } | null;
  passwordMatches: boolean;
}): "ok" | "rejected" {
  if (!input.user || input.user.status !== "ACTIVE" || !input.passwordMatches) return "rejected";
  if (!adminSignInAllowed(input.user)) return "rejected";
  return "ok";
}

/** Safe to log. No address and no password. */
export function adminLoginTrace(input: {
  found: boolean;
  active: boolean;
  admin: boolean;
  allowed: boolean;
  passwordMatches: boolean;
  passwordChars: number;
}): string {
  const line = [
    "ADMIN_LOGIN",
    "result=rejected",
    `found=${input.found ? 1 : 0}`,
    `active=${input.active ? 1 : 0}`,
    `admin=${input.admin ? 1 : 0}`,
    `allowed=${input.allowed ? 1 : 0}`,
    `compare=${input.passwordMatches ? 1 : 0}`,
    `pw_chars=${input.passwordChars}`,
  ].join(" ");
  if (line.includes("@")) throw new Error("Login trace contained an address");
  return line;
}
/**
 * Nov 6 (Julia, iPhone): once the tester gate is open on a device, the first page is the member sign-in. Testers then
 * put the gate login (a username such as "julia", not an email) in the member Email box. The box used type=email, so
 * iPhone blocked the tap with "Enter an email address" and nothing reached the server. The box is now plain text and a
 * value without "@" gets this message instead.
 */
export const NOT_AN_EMAIL_SIGN_IN_ERROR =
  "This is the member sign-in, and it needs your member email (like you@firm.com), not the tester gate username. The gate step is already done on this device.";

/** True when the member Email box holds something that cannot be an email (for example a gate username). */
export function looksLikeGateUsername(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export const PENDING_APPROVAL_ERROR = "Your application is under review. You can sign in after Richard Osika approves it.";
export const DECLINED_APPLICATION_ERROR = "This application was not approved.";
export const INACTIVE_ACCOUNT_ERROR = "This account is not active. Contact connect@privatefloorclub.com if you need help.";

/**
 * Nov 10 (Julia): a failed sign-in says why. A known email with the wrong password and an email with no account or
 * application get their own messages. Pending and declined applications are still mentioned only after the password
 * matches that application.
 */
export const WRONG_PASSWORD_ERROR = "The password is incorrect for this email. Check it and try again; passwords are case-sensitive.";
export const NO_ACCOUNT_ERROR = "We could not find a member account with this email. Check the spelling, or apply to join.";
export const STAFF_ACCOUNT_ERROR = "This email belongs to a staff account. Staff sign in on the administrator page.";
export const MISSING_PASSWORD_ERROR = "Enter your password.";

/**
 * Pending approval is mentioned only after the password matches a pending application.
 * Nov 10: a wrong password on a known email (member or application) says the password is incorrect; an unknown email
 * says there is no account. Returns null when the member password matches an active account and sign-in should proceed.
 */
export function signInFailureCopy(input: {
  memberFound: boolean;
  memberPasswordMatches: boolean;
  memberActive: boolean;
  pendingApplicationPasswordMatches: boolean;
  declinedApplicationPasswordMatches?: boolean;
  /** Nov 10: an application exists for this email (any password). */
  applicationFound?: boolean;
  /** Nov 10: the password box was empty. */
  passwordEmpty?: boolean;
}): string | null {
  if (input.memberFound && input.memberPasswordMatches && input.memberActive) return null;
  if (input.memberFound && input.memberPasswordMatches && !input.memberActive) return INACTIVE_ACCOUNT_ERROR;
  if (!input.memberFound && input.declinedApplicationPasswordMatches) return DECLINED_APPLICATION_ERROR;
  if (!input.memberFound && input.pendingApplicationPasswordMatches) return PENDING_APPROVAL_ERROR;
  if (input.passwordEmpty) return MISSING_PASSWORD_ERROR;
  if (input.memberFound || input.applicationFound) return WRONG_PASSWORD_ERROR;
  return NO_ACCOUNT_ERROR;
}
