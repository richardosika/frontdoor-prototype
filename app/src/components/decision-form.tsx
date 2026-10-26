"use client";

import { useState } from "react";
import { reviewApplication, revokeApproval } from "@/actions/admin";
import { decideInviteReview } from "@/actions/verification";
import { btn, btnOutline, field, labelCls } from "@/components/ui";

export function DecisionForm({
  applicationId,
  caseId,
  notLegit,
  confirmLabel = "The recommendation is NOT LEGIT.",
  paying = false,
  strongWarning = false,
  warningText = "",
}: {
  applicationId: string;
  caseId?: string;
  notLegit: boolean;
  confirmLabel?: string;
  paying?: boolean;
  strongWarning?: boolean;
  warningText?: string;
}) {
  const [error, setError] = useState("");
  return (
    <form
      action={reviewApplication}
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        setError("");
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const decision = submitter instanceof HTMLButtonElement ? submitter.value : "";
        const message = String(new FormData(event.currentTarget).get("applicantMessage") || "").trim();
        if (decision === "NEEDS_INFO" && message.length < 2) {
          event.preventDefault();
          setError("Write the message the applicant should see.");
          return;
        }
        if (decision === "APPROVED") {
          const dues = paying
            ? "Approve this person? The membership-dues link goes out only after you approve."
            : "Approve this person? This role can sign in right away.";
          const warning = notLegit ? ` ${confirmLabel}` : "";
          const confirmed = window.confirm(`${dues}${warning}`);
          if (!confirmed) {
            event.preventDefault();
            return;
          }
          if (strongWarning) {
            const box = event.currentTarget.querySelector('input[name="acknowledgeGrade"]');
            if (box instanceof HTMLInputElement && !box.checked) {
              event.preventDefault();
              setError("Check the box to confirm this approval.");
              return;
            }
            const second = window.confirm(warningText || "Approve this file despite the grade?");
            if (!second) {
              event.preventDefault();
              return;
            }
            const strong = event.currentTarget.querySelector('input[name="confirmStrong"]');
            if (strong instanceof HTMLInputElement) strong.value = "yes";
          }
          if (notLegit || strongWarning) {
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
      {caseId ? <input type="hidden" name="caseId" value={caseId} /> : null}
      {caseId ? <input type="hidden" name="returnTo" value={`/admin/verification/${caseId}`} /> : null}
      <input type="hidden" name="confirmNotLegit" value="" />
      <input type="hidden" name="confirmStrong" value="" />
      {error ? <p className="text-sm text-brass">{error}</p> : null}
      {strongWarning ? (
        <div className="rounded border border-[#7A2E2E] bg-cream p-3 text-sm text-[#7A2E2E]" role="alert">
          <p className="font-semibold">This file is not a clean approval.</p>
          <p className="mt-1 whitespace-pre-wrap">{warningText}</p>
          <label className="mt-2 flex items-start gap-2 text-ink">
            <input name="acknowledgeGrade" type="checkbox" className="mt-1" />
            <span>I confirm this approval despite the grade and the unverified items.</span>
          </label>
        </div>
      ) : null}
      <label className={labelCls}>Internal note</label>
      <textarea name="note" className={field} rows={3} placeholder="Private. Never emailed and never shown to the applicant." />
      <label className={labelCls}>Message to applicant (shown in their email)</label>
      <textarea
        name="applicantMessage"
        className={field}
        rows={3}
        placeholder="Optional. This is the only note the applicant sees. Required if you ask for more info."
      />
      {notLegit ? (
        <p className="text-sm text-brass">{confirmLabel} Approving asks for a second confirmation and is written to the audit log.</p>
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

export function RevokeApprovalForm({ applicationId, caseId }: { applicationId: string; caseId?: string }) {
  const [error, setError] = useState("");
  return (
    <form
      action={revokeApproval}
      className="mt-4 space-y-2 rounded border border-[#7A2E2E] p-3"
      onSubmit={(event) => {
        const reason = String(new FormData(event.currentTarget).get("reason") || "").trim();
        if (reason.length < 2) {
          event.preventDefault();
          setError("Write the reason for revoking approval.");
          return;
        }
        const confirmed = window.confirm(
          "Revoke this approval? The pay link stops working. Membership access ends when it is unpaid and still active. The reason is written to the audit log and is not emailed.",
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      {caseId ? <input type="hidden" name="caseId" value={caseId} /> : null}
      <p className="text-sm font-semibold text-[#7A2E2E]">Revoke approval</p>
      <p className="text-sm text-ink">The pay link is deactivated. An unpaid active membership loses access. Delete stays available below.</p>
      {error ? <p className="text-sm text-brass">{error}</p> : null}
      <label className={labelCls}>Reason</label>
      <textarea name="reason" className={field} rows={3} placeholder="Private. Logged on this file. Not shown to the applicant." />
      <button className={`${btnOutline} min-h-12 w-full border-[#7A2E2E] text-[#7A2E2E] sm:w-auto`} type="submit">
        Revoke approval
      </button>
    </form>
  );
}

export function InviteDecisionForm({ caseId }: { caseId: string }) {
  return (
    <form
      action={decideInviteReview}
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const decision = submitter instanceof HTMLButtonElement ? submitter.value : "";
        if (decision === "APPROVED") {
          const confirmed = window.confirm("Approve this request to join? A referral code goes out, and this file is marked Verified.");
          if (!confirmed) event.preventDefault();
        }
        if (decision === "DECLINED") {
          const confirmed = window.confirm("Decline this request to join? This file is marked Rejected.");
          if (!confirmed) event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="caseId" value={caseId} />
      <label className={labelCls}>Internal note</label>
      <textarea name="note" className={field} rows={3} placeholder="Private. Shown on this file. Not emailed." />
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
