"use client";

import { useRef, useState, type ReactNode } from "react";
import { reviewApplication, revokeApproval } from "@/actions/admin";
import { decideInviteReview } from "@/actions/verification";
import { btn, btnOutline, field, labelCls } from "@/components/ui";

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
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-forest/50 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="decision-confirm-title" className="w-full max-w-md rounded border border-line bg-paper p-4 shadow-[0_30px_80px_rgba(0,0,0,.28)]">
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
}: {
  applicationId: string;
  caseId?: string;
  notLegit: boolean;
  confirmLabel?: string;
  paying?: boolean;
  strongWarning?: boolean;
  warningText?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const allowSubmit = useRef(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [modalError, setModalError] = useState("");
  const [pending, setPending] = useState<"APPROVED" | "DECLINED" | null>(null);

  function approveBody() {
    const dues = paying
      ? "Approve this person? The membership-dues link goes out only after you approve."
      : "Approve this person? This role can sign in right away.";
    const warning = notLegit ? ` ${confirmLabel}` : "";
    const second = strongWarning ? `\n\n${warningText || "Approve this file despite the grade?"}` : "";
    return `${dues}${warning}${second}`;
  }

  function cancelPending() {
    const decision = pending;
    setPending(null);
    setModalError("");
    setResult(
      decision === "DECLINED"
        ? "Decline was not recorded. Nothing was sent."
        : "Approval was not recorded. Nothing was sent.",
    );
  }

  function confirmPending() {
    const form = formRef.current;
    if (!form || !pending) return;
    if (pending === "APPROVED" && strongWarning) {
      const box = form.querySelector('input[name="acknowledgeGrade"]');
      if (!(box instanceof HTMLInputElement) || !box.checked) {
        setModalError("Check the box to confirm this approval. Approval was not sent.");
        return;
      }
      const strong = form.querySelector('input[name="confirmStrong"]');
      if (strong instanceof HTMLInputElement) strong.value = "yes";
    }
    if (pending === "APPROVED" && (notLegit || strongWarning)) {
      const input = form.querySelector('input[name="confirmNotLegit"]');
      if (input instanceof HTMLInputElement) input.value = "yes";
    }
    const button = form.querySelector(`button[value="${pending}"]`);
    setPending(null);
    setModalError("");
    setResult("");
    allowSubmit.current = true;
    if (button instanceof HTMLButtonElement) form.requestSubmit(button);
  }

  return (
    <form
      ref={formRef}
      action={reviewApplication}
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        if (allowSubmit.current) {
          allowSubmit.current = false;
          return;
        }
        setError("");
        setResult("");
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const decision = submitter instanceof HTMLButtonElement ? submitter.value : "";
        const message = String(new FormData(event.currentTarget).get("applicantMessage") || "").trim();
        if (decision === "NEEDS_INFO" && message.length < 2) {
          event.preventDefault();
          setError("Write the message the applicant should see.");
          return;
        }
        if (decision === "APPROVED" || decision === "DECLINED") {
          event.preventDefault();
          setModalError("");
          setPending(decision);
        }
      }}
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      {caseId ? <input type="hidden" name="caseId" value={caseId} /> : null}
      {caseId ? <input type="hidden" name="returnTo" value={`/admin/verification/${caseId}`} /> : null}
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
      {pending ? (
        <ConfirmModal
          title={pending === "APPROVED" ? "Confirm approval" : "Confirm decline"}
          body={
            pending === "APPROVED"
              ? approveBody()
              : "Decline this application? A short notice goes out. The applicant does not see your reason."
          }
          confirmLabel={pending === "APPROVED" ? "Approve" : "Decline"}
          error={modalError}
          extra={
            pending === "APPROVED" && strongWarning ? (
              <label className="mt-3 flex items-start gap-2 text-sm text-ink">
                <input name="acknowledgeGrade" type="checkbox" className="mt-1" />
                <span>I confirm this approval despite the grade and the unverified items.</span>
              </label>
            ) : null
          }
          onConfirm={confirmPending}
          onCancel={cancelPending}
        />
      ) : null}
    </form>
  );
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

export function InviteDecisionForm({ caseId }: { caseId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const allowSubmit = useRef(false);
  const [result, setResult] = useState("");
  const [pending, setPending] = useState<"APPROVED" | "DECLINED" | null>(null);
  return (
    <form
      ref={formRef}
      action={decideInviteReview}
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        if (allowSubmit.current) {
          allowSubmit.current = false;
          return;
        }
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const decision = submitter instanceof HTMLButtonElement ? submitter.value : "";
        if (decision === "APPROVED" || decision === "DECLINED") {
          event.preventDefault();
          setResult("");
          setPending(decision);
        }
      }}
    >
      <input type="hidden" name="caseId" value={caseId} />
      {result ? (
        <p className="text-sm text-forest" role="status">
          {result}
        </p>
      ) : null}
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
      {pending ? (
        <ConfirmModal
          title={pending === "APPROVED" ? "Confirm approval" : "Confirm decline"}
          body={
            pending === "APPROVED"
              ? "Approve this request to join? A referral code goes out, and this file is marked Verified."
              : "Decline this request to join? This file is marked Rejected."
          }
          confirmLabel={pending === "APPROVED" ? "Approve" : "Decline"}
          error=""
          onConfirm={() => {
            const decision = pending;
            setPending(null);
            setResult("");
            allowSubmit.current = true;
            const button = formRef.current?.querySelector(`button[value="${decision}"]`);
            if (button instanceof HTMLButtonElement) formRef.current?.requestSubmit(button);
          }}
          onCancel={() => {
            const decision = pending;
            setPending(null);
            setResult(
              decision === "DECLINED"
                ? "Decline was not recorded. Nothing was sent."
                : "Approval was not recorded. Nothing was sent.",
            );
          }}
        />
      ) : null}
    </form>
  );
}
