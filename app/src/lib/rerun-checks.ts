/** Where a no-JS re-run form should land. The route answers with HTTP 303. */

export const RERUN_STATUS = 303;

export const RERUN_DONE_NOTICE = "Free-source checks finished. Marks stay Auto-suggested until you confirm them.";

export function rerunChecksHref(caseId: string, outcome: "done" | "missing" | "failed"): string {
  const id = caseId.trim();
  if (!id || outcome === "missing" || /[^a-zA-Z0-9]/.test(id)) {
    return `/admin/verification?error=${encodeURIComponent("That file was not found.")}`;
  }
  if (outcome === "failed") {
    return `/admin/verification/${id}?step=identity&error=${encodeURIComponent("Free-source checks did not finish. Reload and try again.")}`;
  }
  return `/admin/verification/${id}?step=identity&notice=${encodeURIComponent(RERUN_DONE_NOTICE)}`;
}
