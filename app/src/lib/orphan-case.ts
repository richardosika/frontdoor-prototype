/** One-time live cleanup. These two files had no member attached. */
export const ORPHAN_VERIFICATION_CASE_IDS = ["cmvpiu9dk00caim2b3ew4qavo", "cmvpj1zod0021ey2ajbbtte7f"] as const;

/**
 * A case may be removed by the one-time cleanup only when it is one of the named orphans,
 * it is not attached to a member or a project, and it is not Richard's Captiva or BuildPro file.
 */
export function verificationCaseIsDeletableOrphan(input: {
  id: string;
  userId: string | null;
  projectId: string | null;
  userIsAdmin?: boolean;
  text: string;
}): boolean {
  if (!ORPHAN_VERIFICATION_CASE_IDS.includes(input.id as (typeof ORPHAN_VERIFICATION_CASE_IDS)[number])) return false;
  if (input.userId || input.projectId || input.userIsAdmin) return false;
  if (/captiva|buildpro/i.test(input.text)) return false;
  if (/rich@privatefloorclub\.com|rich@buildpro-cs\.com/i.test(input.text)) return false;
  return true;
}
