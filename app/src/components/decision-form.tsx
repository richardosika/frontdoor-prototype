"use client";

import { reviewApplication } from "@/actions/admin";
import { btn, btnOutline, field, labelCls } from "@/components/ui";

export function DecisionForm({
  applicationId,
  notLegit,
  confirmLabel = "The recommendation is NOT LEGIT.",
}: {
  applicationId: string;
  notLegit: boolean;
  confirmLabel?: string;
}) {
  return (
    <form
      action={reviewApplication}
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const decision = submitter instanceof HTMLButtonElement ? submitter.value : "";
        if (notLegit && decision === "APPROVED") {
          const confirmed = window.confirm(`${confirmLabel} Approve this applicant anyway?`);
          if (!confirmed) {
            event.preventDefault();
            return;
          }
          const input = event.currentTarget.querySelector('input[name="confirmNotLegit"]');
          if (input instanceof HTMLInputElement) input.value = "yes";
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
      <div className="flex flex-wrap gap-2">
        <button className={btn} name="decision" value="APPROVED" type="submit">
          Approve as Invited member
        </button>
        <button className={btnOutline} name="decision" value="NEEDS_INFO" type="submit">
          Needs more info
        </button>
        <button className={btnOutline} name="decision" value="DECLINED" type="submit">
          Decline
        </button>
      </div>
    </form>
  );
}
