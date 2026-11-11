import { DECLINED_APPLICATION_ERROR, GENERIC_SIGN_IN_ERROR, INACTIVE_ACCOUNT_ERROR, MISSING_PASSWORD_ERROR, NO_ACCOUNT_ERROR, NOT_AN_EMAIL_SIGN_IN_ERROR, PENDING_APPROVAL_ERROR, STAFF_ACCOUNT_ERROR, WRONG_PASSWORD_ERROR } from "@/lib/sign-in";

/**
 * Nov 6 (Julia, phone): a sign-in page left open across a site update posts to a server action the new build no longer
 * has. Next.js answers 404, the page's error screen reloads itself, and the member lands back on an empty sign-in page
 * with no message (on iPhone the tester-gate pop-up can show again on that reload). The sign-in form now falls back to a
 * plain form post to /login/submit, which does not depend on the build, and errors come back as a short code.
 */
export const SIGN_IN_FALLBACK_PATH = "/login/submit";

const CODES: Record<string, string> = {
  generic: GENERIC_SIGN_IN_ERROR,
  pending: PENDING_APPROVAL_ERROR,
  declined: DECLINED_APPLICATION_ERROR,
  inactive: INACTIVE_ACCOUNT_ERROR,
  "not-email": NOT_AN_EMAIL_SIGN_IN_ERROR,
  "wrong-password": WRONG_PASSWORD_ERROR,
  "no-account": NO_ACCOUNT_ERROR,
  staff: STAFF_ACCOUNT_ERROR,
  "no-password": MISSING_PASSWORD_ERROR,
};

export function signInErrorCode(message: string): string {
  for (const [code, text] of Object.entries(CODES)) if (text === message) return code;
  return "generic";
}

/** Only known codes turn into copy, so the query string cannot put arbitrary text on the page. */
export function signInErrorFromCode(code: string | undefined | null): string {
  return code && CODES[code] ? CODES[code] : "";
}
