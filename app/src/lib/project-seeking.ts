/** Membership types that can own a project seeking members. */
export const PROJECT_OWNER_ROLES = [
  "DEVELOPER",
  "GENERAL_CONTRACTOR",
  "ARCHITECT_ENGINEER",
  "INVESTOR_PE",
  "FAMILY_OFFICE",
] as const;

/** Membership types that can seek a team on a project. */
export function canSeekOnProject(role: string | null | undefined): boolean {
  return (PROJECT_OWNER_ROLES as readonly string[]).includes(String(role ?? ""));
}
