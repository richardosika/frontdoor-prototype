"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { reviewApplication, revokeApproval } from "@/actions/admin";
import { DECISION_ACK_KEY, DECISION_DIALOG_ID, DECISION_MEMORY_KEY } from "@/lib/decision-dialog";
import {
  claimDecisionReplay,
  clearDecisionQueue,
  readDecisionQueue,
  stepSaveBusy,
  writeDecisionQueue,
  type QueuedDecision,
} from "@/lib/decision-queue";
import { decideInviteReview } from "@/actions/verification";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { approveConfirmMessage } from "@/lib/review-steps";

const SAVING_STEP = "Saving this step. Approval sends when that finishes.";

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
}: {
  applicationId: string;
  caseId?: string;
  notLegit: boolean;
  confirmLabel?: string;
  paying?: boolean;
  strongWarning?: boolean;
  warningText?: string;
  unverified?: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const boxRef = useRef<HTMLInputElement>(null);
  const allowSubmit = useRef(false);
  const pendingRef = useRef<"APPROVED" | "DECLINED" | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [modalError, setModalError] = useState("");
  const [pending, setPending] = useState<"APPROVED" | "DECLINED" | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  pendingRef.current = pending;

  function approveBody() {
    const dues = paying
      ? "Approve this person? The membership-dues link goes out only after you approve."
      : "Approve this person? This role can sign in right away.";
    const base = approveConfirmMessage({ dues, extra: notLegit ? confirmLabel : "", unverified });
    const second = strongWarning ? `\n\n${warningText || "Approve this file despite the grade?"}` : "";
    return `${base}${second}`;
  }

  function remember(decision: "APPROVED" | "DECLINED" | null) {
    try {
      if (!decision) {
        sessionStorage.removeItem(DECISION_MEMORY_KEY);
        sessionStorage.removeItem(DECISION_ACK_KEY);
        return;
      }
      sessionStorage.setItem(DECISION_MEMORY_KEY, decision);
    } catch {
      // Private browsing can reject storage. The dialog still opens from the click.
    }
  }

  function restoreAck() {
    if (!boxRef.current) return;
    try {
      boxRef.current.checked = sessionStorage.getItem(DECISION_ACK_KEY) === "1";
    } catch {
      // Leave the box as the browser painted it.
    }
  }

  useEffect(() => {
    const saved = (() => {
      try {
        const value = sessionStorage.getItem(DECISION_MEMORY_KEY);
        return value === "APPROVED" || value === "DECLINED" ? value : null;
      } catch {
        return null;
      }
    })();
    if (saved) {
      setPending(saved);
      restoreAck();
    }
    const node = dialogRef.current;
    const onCancel = (event: Event) => {
      event.preventDefault();
      const decision = pendingRef.current;
      clearDecisionQueue();
      remember(null);
      setPending(null);
      setModalError("");
      setResult(
        decision === "DECLINED"
          ? "Decline was not recorded. Nothing was sent."
          : "Approval was not recorded. Nothing was sent.",
      );
    };
    node?.addEventListener("cancel", onCancel);
    return () => node?.removeEventListener("cancel", onCancel);
    // Restore once, after hydration, including a tick that landed before React attached.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const node = dialogRef.current;
    if (node) node.setAttribute("data-react-bound", "1");
    let saved = "";
    try {
      saved = sessionStorage.getItem(DECISION_MEMORY_KEY) || "";
    } catch {
      saved = "";
    }
    if ((saved === "APPROVED" || saved === "DECLINED") && node && !node.open) {
      node.removeAttribute("data-decision-closing");
      node.setAttribute("data-pending", saved);
      node.showModal();
    }
  });

  useLayoutEffect(() => {
    const node = dialogRef.current;
    return () => {
      if (!node) return;
      node.setAttribute("data-decision-closing", "1");
      if (node.open) node.close();
    };
  }, []);

  useEffect(() => {
    let timer = 0;
    const sync = () => setSaveBusy(stepSaveBusy());
    sync();
    const replay = () => {
      sync();
      window.clearTimeout(timer);
      timer = window.setTimeout(() => replayQueued(), 300);
    };
    window.addEventListener("pf-step-save", replay);
    timer = window.setTimeout(() => replayQueued(), 80);
    return () => {
      window.removeEventListener("pf-step-save", replay);
      window.clearTimeout(timer);
    };
    // Replay a click that landed while a step save was still in flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, caseId]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (node.getAttribute("data-decision-closing") === "1") return;
    if (!pending) {
      let saved = "";
      try {
        saved = sessionStorage.getItem(DECISION_MEMORY_KEY) || "";
      } catch {
        saved = "";
      }
      if (saved === "APPROVED" || saved === "DECLINED") return;
      if (node.open) node.close();
      return;
    }
    node.setAttribute("data-pending", pending);
    if (!node.open) node.showModal();
    restoreAck();
  }, [pending]);

  function closeDialog() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.setAttribute("data-decision-closing", "1");
    if (dialog.open) dialog.close();
  }

  function submitDecision(decision: "APPROVED" | "DECLINED", ack: boolean) {
    const form = formRef.current;
    if (!form) return;
    if (decision === "APPROVED" && (ack || notLegit || strongWarning)) {
      if (strongWarning) {
        const strong = form.querySelector('input[name="confirmStrong"]');
        if (strong instanceof HTMLInputElement) strong.value = "yes";
      }
      if (notLegit || strongWarning) {
        const legit = form.querySelector('input[name="confirmNotLegit"]');
        if (legit instanceof HTMLInputElement) legit.value = "yes";
      }
    }
    remember(null);
    closeDialog();
    allowSubmit.current = true;
    const button = form.querySelector(`button[name="decision"][value="${decision}"]`);
    if (button instanceof HTMLButtonElement) form.requestSubmit(button);
  }

  function replayQueued() {
    const queued = readDecisionQueue();
    if (!queued || queued.applicationId !== applicationId) return;
    if (caseId && queued.caseId && queued.caseId !== caseId) return;
    const notice = decisionNotice();
    if (approvalLanded(notice)) {
      clearDecisionQueue();
      remember(null);
      closeDialog();
      return;
    }
    if (stepSaveBusy()) return;
    if (!formRef.current?.isConnected) return;
    if (queued.decision === "APPROVED" && strongWarning && !queued.ack) return;
    if (!claimDecisionReplay(queued)) return;
    setPending(queued.decision);
    setModalError("");
    submitDecision(queued.decision, queued.ack);
  }

  function openPending(decision: "APPROVED" | "DECLINED") {
    pendingRef.current = decision;
    dialogRef.current?.removeAttribute("data-decision-closing");
    remember(decision);
    setError("");
    setResult("");
    setModalError("");
    setPending(decision);
  }

  function cancelPending() {
    const decision = pending;
    clearDecisionQueue();
    remember(null);
    setPending(null);
    setModalError("");
    setResult(
      decision === "DECLINED"
        ? "Decline was not recorded. Nothing was sent."
        : "Approval was not recorded. Nothing was sent.",
    );
  }

  function ackChecked() {
    const box = dialogRef.current?.querySelector('[data-decision-ack="1"]');
    if (box instanceof HTMLInputElement) return box.checked;
    return Boolean(boxRef.current?.checked);
  }

  function confirmPending() {
    const form = formRef.current;
    let decision = pendingRef.current;
    if (!decision) {
      try {
        const stored = sessionStorage.getItem(DECISION_MEMORY_KEY);
        if (stored === "APPROVED" || stored === "DECLINED") decision = stored;
      } catch {
        decision = null;
      }
    }
    if (!form || !decision) return;
    const ack = ackChecked();
    if (decision === "APPROVED" && strongWarning && !ack) {
      setModalError("Check the box to confirm this approval. Approval was not sent.");
      return;
    }
    const waiting = stepSaveBusy();
    const queued: QueuedDecision = {
      applicationId,
      caseId: caseId || "",
      decision,
      ack,
      at: Date.now(),
      waiting,
    };
    writeDecisionQueue(queued);
    if (waiting) {
      setModalError(SAVING_STEP);
      return;
    }
    if (!claimDecisionReplay(queued)) return;
    setModalError("");
    setResult("");
    submitDecision(decision, queued.ack);
  }

  const showing = pending || "APPROVED";

  return (
    <>
    <form
      ref={formRef}
      action={reviewApplication}
      data-decision-form="1"
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        if (allowSubmit.current || event.currentTarget.getAttribute("data-decision-allow") === "1") {
          allowSubmit.current = false;
          event.currentTarget.removeAttribute("data-decision-allow");
          return;
        }
        if (pending) {
          event.preventDefault();
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
          openPending(decision);
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
    <dialog
      id={DECISION_DIALOG_ID}
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-confirm-title"
      data-pending={showing}
      suppressHydrationWarning
      className="w-[min(100%-2rem,28rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded border border-line bg-paper p-4 shadow-[0_30px_80px_rgba(0,0,0,.28)] backdrop:bg-forest/50"
    >
      <h2 id="decision-confirm-title" className="font-serif text-2xl font-normal text-forest">
        {showing === "DECLINED" ? "Confirm decline" : "Confirm approval"}
      </h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
        {showing === "DECLINED"
          ? "Decline this application? A short notice goes out. The applicant does not see your reason."
          : approveBody()}
      </p>
      {strongWarning && showing !== "DECLINED" ? (
        <label className="mt-3 flex items-start gap-2 text-sm text-ink">
          <input
            ref={boxRef}
            name="acknowledgeGrade"
            data-decision-ack="1"
            type="checkbox"
            className="mt-1"
            onChange={(event) => {
              try {
                sessionStorage.setItem(DECISION_ACK_KEY, event.currentTarget.checked ? "1" : "0");
              } catch {
                // The checkbox itself keeps the tick when storage is blocked.
              }
            }}
          />
          <span>I confirm this approval despite the grade and the unverified items.</span>
        </label>
      ) : null}
      <p className="mt-3 text-sm text-brass" role="alert" data-decision-error="1" hidden={!modalError}>
        {modalError}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          className={`${btn} min-h-12 w-full sm:w-auto${saveBusy ? " opacity-60" : ""}`}
          type="button"
          data-decision-confirm="1"
          data-decision-waiting={saveBusy ? "1" : undefined}
          aria-disabled={saveBusy || undefined}
          onClick={confirmPending}
        >
          {showing === "DECLINED" ? "Decline" : "Approve"}
        </button>
        <button className={`${btnOutline} min-h-12 w-full sm:w-auto`} type="button" data-decision-cancel="1" onClick={cancelPending}>
          Cancel
        </button>
      </div>
    </dialog>
  </>
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

export function InviteDecisionForm({ caseId, unverified = [] }: { caseId: string; unverified?: string[] }) {
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
              ? approveConfirmMessage({
                  dues: "Approve this request to join? A referral code goes out, and this file is marked Verified.",
                  unverified,
                })
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
