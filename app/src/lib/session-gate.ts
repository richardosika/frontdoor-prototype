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

export const JOIN_ENTRY_HASH = "#request-to-join";
const JOIN_ENTRY_HASHES = new Set(["#request-to-join", "#request-invite"]);

/** The public request form and the apply wizard. A signed-in visit to either gets the already-signed-in notice. */
export function isSignedInJoinEntry(path: string, hash = ""): boolean {
  if (path === "/apply" || path === "/join" || path.startsWith("/join/")) return true;
  const fragment = hash.startsWith("#") || hash === "" ? hash : `#${hash}`;
  return JOIN_ENTRY_HASHES.has(fragment) && (path === "/" || path === "/feed");
}

export function alreadySignedInNotice(name: string): string {
  const who = name.trim() || "this account";
  return `You're already signed in as ${who}. To request to join as someone else, sign out first.`;
}

/**
 * Old JWTs die when SESSION_ISSUED_AFTER is a unix timestamp in seconds.
 * A 13-digit value is milliseconds. A cutoff still in the future would reject the sign-in that just happened.
 */
export function sessionCutoffSeconds(cutoffRaw: string | undefined, nowSeconds: number): number | null {
  if (cutoffRaw == null || cutoffRaw.trim() === "") return null;
  let cutoff = Number(cutoffRaw.trim());
  if (!Number.isFinite(cutoff) || cutoff <= 0) return null;
  if (cutoff > 1e12) cutoff = Math.floor(cutoff / 1000);
  if (cutoff >= nowSeconds) return nowSeconds - 1;
  return cutoff;
}

export function sessionCutoffReport(cutoffRaw: string | undefined, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const cutoff = sessionCutoffSeconds(cutoffRaw, nowSeconds);
  if (cutoff == null) return "SESSION_CUTOFF present=0";
  const digits = cutoffRaw?.trim().length ?? 0;
  return `SESSION_CUTOFF present=1 digits=${digits} accepts_now=${nowSeconds > cutoff ? 1 : 0}`;
}

export function sessionIssuedAtAccepted(
  issuedAt: unknown,
  cutoffRaw: string | undefined,
  freshSignIn: boolean,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (freshSignIn) return true;
  const cutoff = sessionCutoffSeconds(cutoffRaw, nowSeconds);
  if (cutoff == null) return true;
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
