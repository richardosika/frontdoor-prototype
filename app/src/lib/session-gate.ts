/** Where a signed-in account may go. A missing session uses login. A signed-in inactive account never returns to login. */
export function inactiveAccountPath(user: { status: string } | null): "/login" | "/suspended" | null {
  if (!user) return "/login";
  if (user.status !== "ACTIVE") return "/suspended";
  return null;
}

/** Logged-in visits to the marketing page and the sign-in form continue into the floor. The suspended page stays put. */
export function loggedInPublicRedirect(path: string): "/feed" | null {
  if (path === "/" || path === "/login") return "/feed";
  return null;
}

/** Public member sign-in. Someone already signed in goes straight to the floor. */
export function memberLoginHref(signedIn: boolean): "/feed" | "/login" {
  return signedIn ? "/feed" : "/login";
}

export const JOIN_ENTRY_HASH = "#request-invite";

/** The public request form and the apply wizard. A signed-in visit to either gets the already-signed-in notice. */
export function isSignedInJoinEntry(path: string, hash = ""): boolean {
  if (path === "/apply") return true;
  const fragment = hash.startsWith("#") || hash === "" ? hash : `#${hash}`;
  return fragment === JOIN_ENTRY_HASH && (path === "/" || path === "/feed");
}

export function alreadySignedInNotice(name: string): string {
  const who = name.trim() || "this account";
  return `You're already signed in as ${who}. To request to join as someone else, sign out first.`;
}

/**
 * Old JWTs die when SESSION_ISSUED_AFTER is a unix timestamp in seconds.
 * A fresh sign-in (the user object is present) is allowed through so the new token can be issued.
 */
export function sessionIssuedAtAccepted(issuedAt: unknown, cutoffRaw: string | undefined, freshSignIn: boolean): boolean {
  if (freshSignIn) return true;
  if (cutoffRaw == null || cutoffRaw === "") return true;
  const cutoff = Number(cutoffRaw);
  if (!Number.isFinite(cutoff) || cutoff <= 0) return true;
  const issued = typeof issuedAt === "number" ? issuedAt : Number(issuedAt);
  if (!Number.isFinite(issued)) return false;
  return issued > cutoff;
}

/** The administrator sign-in is public. A signed-in administrator continues to the admin home. A signed-in member returns to the floor. */
export function adminEntryRedirect(path: string, session: { isAdmin: boolean } | null): "/admin" | "/feed" | null {
  if (path !== "/admin/login") return null;
  if (!session) return null;
  return session.isAdmin ? "/admin" : "/feed";
}
