/** Nov 10 (Julia): a project is "New" for 7 days after staff approve it (or after it was submitted, if older). */
export const NEW_FOR_MS = 7 * 86400000;

export function isNewOpportunity(project: { reviewedAt: Date | null; submittedAt: Date }, now = Date.now()): boolean {
  const at = (project.reviewedAt ?? project.submittedAt).getTime();
  return now - at <= NEW_FOR_MS && now >= at - 60000;
}
