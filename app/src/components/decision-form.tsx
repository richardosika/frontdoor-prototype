"use client";

import { reviewApplication } from "@/actions/admin";
import { btn, btnOutline, field, labelCls } from "@/components/ui";

export function DecisionForm({
  applicationId,
  notLegit,
  confirmLabel = "The recommendation is NOT LEGIT.",
  paying = false,
}: {
  applicationId: string;
  notLegit: boolean;
  confirmLabel?: string;
  paying?: boolean;
}) {
  return (
    <form
      action={reviewApplication}
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const decision = submitter instanceof HTMLButtonElement ? submitter.value : "";
        if (decision === "APPROVED") {
          const dues = paying
            ? "Approve this person? The annual-dues link goes out only after you approve."
            : "Approve this person? This role can sign in right away.";
          const warning = notLegit ? ` ${confirmLabel}` : "";
          const confirmed = window.confirm(`${dues}${warning}`);
          if (!confirmed) {
            event.preventDefault();
            return;
          }
          if (notLegit) {
            const input = event.currentTarget.querySelector('input[name="confirmNotLegit"]');
            if (input instanceof HTMLInputElement) input.value = "yes";
          }
        }
        if (decision === "DECLINED") {
          const confirmed = window.confirm("Decline this application? A short notice goes out. The applicant does not see your reason.");
          if (!confirmed) event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="confirmNotLegit" value="" />
      <label className={labelCls}>Note</label>
      <textarea name="note" className={field} rows={3} placeholder="Shown if you approve or ask for more info. Hidden if you decline." />
      {notLegit ? (
        <p className="text-sm text-brass">{confirmLabel} Approving asks for confirmation and is written to the audit log.</p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button className={`${btn} min-h-12 w-full sm:w-auto`} name="decision" value="APPROVED" type="submit">
          Approve
        </button>
        <button className={`${btnOutline} min-h-12 w-full sm:w-auto`} name="decision" value="NEEDS_INFO" type="submit">
          Request more info
        </button>
        <button className={`${btnOutline} min-h-12 w-full sm:w-auto`} name="decision" value="DECLINED" type="submit">
          Decline
        </button>
      </div>
    </form>
  );
}
