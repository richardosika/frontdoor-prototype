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
