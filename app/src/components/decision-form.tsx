"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { reviewApplication, revokeApproval } from "@/actions/admin";
import { DECISION_ACK_KEY, DECISION_DIALOG_ID, DECISION_MEMORY_KEY, publishDecisionDialog } from "@/lib/decision-dialog";
import { clearDecisionQueue } from "@/lib/decision-queue";
import { decideInviteReview } from "@/actions/verification";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { approveConfirmMessage } from "@/lib/review-steps";

function decisionNotice(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("notice") || "";
}

function approvalLanded(notice: string): boolean {
  return /approved|declined|asked for more info/i.test(notice);
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  error,
  extra,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  error: string;
  extra?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-forest/50 p-4">
      <div className="flex min-h-full items-end justify-center sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="decision-confirm-title" className="my-auto w-full max-w-md rounded border border-line bg-paper p-4 shadow-[0_30px_80px_rgba(0,0,0,.28)]">
        <h2 id="decision-confirm-title" className="font-serif text-2xl font-normal text-forest">
          {title}
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{body}</p>
        {extra}
        {error ? (
          <p className="mt-3 text-sm text-brass" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button className={`${btn} min-h-12 w-full sm:w-auto`} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className={`${btnOutline} min-h-12 w-full sm:w-auto`} type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

export function DecisionForm({
  applicationId,
  caseId,
  notLegit,
  confirmLabel = "The recommendation is NOT LEGIT.",
  paying = false,
  strongWarning = false,
  warningText = "",
  unverified = [],
  failed = [],
  variant = "application",
}: {
  applicationId: string;
  caseId?: string;
  notLegit: boolean;
  confirmLabel?: string;
  paying?: boolean;
  strongWarning?: boolean;
  warningText?: string;
  unverified?: string[];
  failed?: string[];
  variant?: "application" | "invite";
}) {
  const allowSubmit = useRef(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const invite = variant === "invite";

  function approveBody() {
    const dues = invite
      ? "Approve this request to join? A referral code goes out, and this file is marked Verified."
      : paying
        ? "Approve this person? The membership-dues link goes out only after you approve."
        : "Approve this person? This role can sign in right away.";
    const base = approveConfirmMessage({ dues, extra: notLegit ? confirmLabel : "", unverified, failed });
    const second = strongWarning ? `\n\n${warningText || "Approve this file despite the grade?"}` : "";
    return `${base}${second}`;
  }

  useLayoutEffect(() => {
    publishDecisionDialog({
      approveBody: approveBody(),
      declineBody: invite
        ? "Decline this request to join? This file is marked Rejected."
        : "Decline this application? A short notice goes out. The applicant does not see your reason.",
      showAck: strongWarning,
      markNotLegit: notLegit || strongWarning,
      applicationId,
      caseId: caseId || "",
    });
  });

  useEffect(() => {
    const onCancel = (event: Event) => {
      const decision = event instanceof CustomEvent ? event.detail : "";
      setResult(
        decision === "DECLINED"
          ? "Decline was not recorded. Nothing was sent."
          : "Approval was not recorded. Nothing was sent.",
      );
    };
    window.addEventListener("pf-decision-cancel", onCancel);
    return () => window.removeEventListener("pf-decision-cancel", onCancel);
  }, []);

  function openPending(decision: "APPROVED" | "DECLINED") {
    try {
      sessionStorage.setItem(DECISION_MEMORY_KEY, decision);
    } catch {
      // Private browsing can reject storage. The dialog still opens from the click.
    }
    setError("");
    setResult("");
    window.dispatchEvent(new Event("pf-decision-open"));
  }

  return (
    <form
      action={invite ? decideInviteReview : reviewApplication}
      data-decision-form="1"
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        if (allowSubmit.current || event.currentTarget.getAttribute("data-decision-allow") === "1") {
          allowSubmit.current = false;
          event.currentTarget.removeAttribute("data-decision-allow");
          return;
        }
        setError("");
        setResult("");
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const decision = submitter instanceof HTMLButtonElement ? submitter.value : "";
        if (decision === "NEEDS_INFO") {
          const fieldName = invite ? "note" : "applicantMessage";
          const message = String(new FormData(event.currentTarget).get(fieldName) || "").trim();
          if (message.length < 2) {
            event.preventDefault();
            setError(invite ? "Write what you need from the applicant." : "Write the message the applicant should see.");
            return;
          }
        }
        if (decision === "APPROVED" || decision === "DECLINED") {
          event.preventDefault();
          openPending(decision);
        }
      }}
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      {caseId ? <input type="hidden" name="caseId" value={caseId} /> : null}
      {caseId && !invite ? <input type="hidden" name="returnTo" value={`/admin/verification/${caseId}`} /> : null}
      <input type="hidden" name="confirmNotLegit" value="" />
      <input type="hidden" name="confirmStrong" value="" />
      {error ? <p className="text-sm text-brass">{error}</p> : null}
      {result ? (
        <p className="text-sm text-forest" role="status">
          {result}
        </p>
      ) : null}
      {strongWarning ? (
        <div className="rounded border border-[#7A2E2E] bg-cream p-3 text-sm text-[#7A2E2E]" role="alert">
          <p className="font-semibold">This file is not a clean approval.</p>
          <p className="mt-1 whitespace-pre-wrap">{warningText}</p>
          <p className="mt-2">The confirmation box is in the approval dialog.</p>
        </div>
      ) : null}
      <label className={labelCls}>Internal note</label>
      <textarea
        name="note"
        className={field}
        rows={3}
        placeholder={invite ? "Private. Shown on this file. Not emailed." : "Private. Never emailed and never shown to the applicant."}
      />
      {invite ? null : (
        <>
          <label className={labelCls}>Message to applicant (shown in their email)</label>
          <textarea
            name="applicantMessage"
            className={field}
            rows={3}
            placeholder="Optional. This is the only note the applicant sees. Required if you ask for more info."
          />
        </>
      )}
      {notLegit ? (
        <p className="text-sm text-brass">{confirmLabel} Approving asks for a second confirmation and is written to the audit log.</p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button className={`${btn} min-h-12 w-full sm:w-auto`} type="button" data-decision-open="APPROVED" onClick={() => openPending("APPROVED")}>
          Approve
        </button>
        <button className={`${btnOutline} min-h-12 w-full sm:w-auto`} name="decision" value="NEEDS_INFO" type="submit">
          Request more info
        </button>
        <button className={`${btnOutline} min-h-12 w-full sm:w-auto`} type="button" data-decision-open="DECLINED" onClick={() => openPending("DECLINED")}>
          Decline
        </button>
      </div>
      <button hidden name="decision" value="APPROVED" type="submit">
        Approve
      </button>
      <button hidden name="decision" value="DECLINED" type="submit">
        Decline
      </button>
    </form>
  );
}

export function SettleDecision({ applicationId }: { applicationId: string }) {
  useEffect(() => {
    const notice = decisionNotice();
    if (!approvalLanded(notice)) return;
    clearDecisionQueue();
    try {
      sessionStorage.removeItem(DECISION_MEMORY_KEY);
      sessionStorage.removeItem(DECISION_ACK_KEY);
    } catch {
      // The notice is already on the page.
    }
    const node = document.getElementById(DECISION_DIALOG_ID);
    if (node instanceof HTMLDialogElement) {
      node.setAttribute("data-decision-closing", "1");
      if (node.open) node.close();
    }
  }, [applicationId]);
  return null;
}

export function RevokeApprovalForm({ applicationId, caseId }: { applicationId: string; caseId?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const allowSubmit = useRef(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <form
      ref={formRef}
      action={revokeApproval}
      className="mt-4 space-y-2 rounded border border-[#7A2E2E] p-3"
      onSubmit={(event) => {
        if (allowSubmit.current) {
          allowSubmit.current = false;
          return;
        }
        const reason = String(new FormData(event.currentTarget).get("reason") || "").trim();
        if (reason.length < 2) {
          event.preventDefault();
          setError("Write the reason for revoking approval.");
          setResult("");
          return;
        }
        event.preventDefault();
        setError("");
        setResult("");
        setOpen(true);
      }}
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      {caseId ? <input type="hidden" name="caseId" value={caseId} /> : null}
      <p className="text-sm font-semibold text-[#7A2E2E]">Revoke approval</p>
      <p className="text-sm text-ink">The pay link is deactivated. An unpaid active membership loses access. Delete stays available below.</p>
      {error ? <p className="text-sm text-brass">{error}</p> : null}
      {result ? (
        <p className="text-sm text-forest" role="status">
          {result}
        </p>
      ) : null}
      <label className={labelCls}>Reason</label>
      <textarea name="reason" className={field} rows={3} placeholder="Private. Logged on this file. Not shown to the applicant." />
      <button className={`${btnOutline} min-h-12 w-full border-[#7A2E2E] text-[#7A2E2E] sm:w-auto`} type="submit">
        Revoke approval
      </button>
      {open ? (
        <ConfirmModal
          title="Confirm revoke"
          body="Revoke this approval? The pay link stops working. Membership access ends when it is unpaid and still active. The reason is written to the audit log and is not emailed."
          confirmLabel="Revoke approval"
          error=""
          onConfirm={() => {
            setOpen(false);
            setResult("");
            allowSubmit.current = true;
            formRef.current?.requestSubmit();
          }}
          onCancel={() => {
            setOpen(false);
            setResult("Revoke was not recorded. The approval is unchanged.");
          }}
        />
      ) : null}
    </form>
  );
}
