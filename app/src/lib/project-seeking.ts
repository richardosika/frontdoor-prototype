/** Membership types that can seek a team on a project. */
export function canSeekOnProject(role: string | null | undefined): boolean {
  return role === "DEVELOPER" || role === "GENERAL_CONTRACTOR" || role === "ARCHITECT_ENGINEER";
}
