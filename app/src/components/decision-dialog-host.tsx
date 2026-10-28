"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { btn, btnOutline } from "@/components/ui";
import {
  DECISION_ACK_KEY,
  DECISION_DIALOG_ID,
  DECISION_MEMORY_KEY,
  getDecisionDialogServerSnapshot,
  getDecisionDialogSnapshot,
  subscribeDecisionDialog,
} from "@/lib/decision-dialog";
import {
  claimDecisionReplay,
  clearDecisionQueue,
  readDecisionQueue,
  stepSaveBusy,
  writeDecisionQueue,
  type QueuedDecision,
} from "@/lib/decision-queue";

const SAVING_STEP = "Saving this step. Approval sends when that finishes.";

function decisionNotice(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("notice") || "";
}

function approvalLanded(notice: string): boolean {
  return /approved|declined|asked for more info/i.test(notice);
}

function readPending(): "APPROVED" | "DECLINED" | null {
  try {
    const value = sessionStorage.getItem(DECISION_MEMORY_KEY);
    return value === "APPROVED" || value === "DECLINED" ? value : null;
  } catch {
    return null;
  }
}

function clearMemory() {
  try {
    sessionStorage.removeItem(DECISION_MEMORY_KEY);
    sessionStorage.removeItem(DECISION_ACK_KEY);
  } catch {
    // The dialog still closes from the click.
  }
}

function decisionForm(): HTMLFormElement | null {
  const form = document.querySelector("form[data-decision-form]");
  return form instanceof HTMLFormElement && form.isConnected ? form : null;
}

function inputValue(form: HTMLFormElement, name: string): string {
  const input = form.querySelector(`input[name="${name}"]`);
  return input instanceof HTMLInputElement ? input.value : "";
}

function setInput(form: HTMLFormElement, name: string, value: string) {
  const input = form.querySelector(`input[name="${name}"]`);
  if (input instanceof HTMLInputElement) input.value = value;
}

/**
 * One confirm dialog for the signed-in shell. Step 8 saves by redirecting the
 * verification page, which used to unmount the dialog for about a second.
 * This node stays mounted, so the dialog and its tick stay on screen.
 */
export function DecisionDialogHost() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const boxRef = useRef<HTMLInputElement>(null);
  const snapshot = useSyncExternalStore(subscribeDecisionDialog, getDecisionDialogSnapshot, getDecisionDialogServerSnapshot);
  const [pending, setPending] = useState<"APPROVED" | "DECLINED" | null>(null);
  const [modalError, setModalError] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const savingRef = useRef(false);
  const showing = pending || "APPROVED";

  function closeDialog(closing: boolean) {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (closing) dialog.setAttribute("data-decision-closing", "1");
    if (dialog.open) dialog.close();
  }

  function restoreAck() {
    const box = boxRef.current;
    if (!box) return;
    try {
      box.checked = sessionStorage.getItem(DECISION_ACK_KEY) === "1";
    } catch {
      // Leave the box as the browser painted it.
    }
  }

  function showIfWanted() {
    const node = dialogRef.current;
    if (!node) return;
    if (approvalLanded(decisionNotice())) {
      clearDecisionQueue();
      clearMemory();
      closeDialog(true);
      setPending(null);
      setModalError("");
      return;
    }
    const decision = readPending();
    if (decision) setPending(decision);
    if (!decision || node.getAttribute("data-decision-closing") === "1") return;
    node.setAttribute("data-pending", decision);
    if (!node.open) node.showModal();
    restoreAck();
  }

  function submitDecision(decision: "APPROVED" | "DECLINED", ack: boolean) {
    const form = decisionForm();
    if (!form) return;
    const snap = getDecisionDialogSnapshot();
    if (decision === "APPROVED" && ack) {
      if (snap.showAck) setInput(form, "confirmStrong", "yes");
      if (snap.markNotLegit || snap.showAck) setInput(form, "confirmNotLegit", "yes");
    }
    clearMemory();
    setSaveBusy(true);
    setModalError("Saving approval...");
    form.setAttribute("data-decision-allow", "1");
    const button = form.querySelector(`button[name="decision"][value="${decision}"]`);
    if (button instanceof HTMLButtonElement) form.requestSubmit(button);
  }

  function replayQueued() {
    const queued = readDecisionQueue();
    if (!queued) return;
    if (approvalLanded(decisionNotice())) {
      clearDecisionQueue();
      clearMemory();
      closeDialog(true);
      return;
    }
    if (stepSaveBusy()) return;
    const form = decisionForm();
    if (!form) return;
    const applicationId = inputValue(form, "applicationId");
    const caseId = inputValue(form, "caseId");
    if (queued.applicationId !== applicationId) return;
    if (caseId && queued.caseId && queued.caseId !== caseId) return;
    if (queued.decision === "APPROVED" && getDecisionDialogSnapshot().showAck && !queued.ack) return;
    if (!claimDecisionReplay(queued)) return;
    setPending(queued.decision);
    setModalError("");
    submitDecision(queued.decision, queued.ack);
  }

  useLayoutEffect(() => {
    const node = dialogRef.current;
    if (node) node.setAttribute("data-react-bound", "1");
    if (!pathname.startsWith("/admin/verification/")) {
      if (readPending() || node?.open) {
        clearDecisionQueue();
        clearMemory();
        closeDialog(true);
        setPending(null);
      }
      return;
    }
    showIfWanted();
  });

  useEffect(() => {
    const onSave = () => {
      setSaveBusy(stepSaveBusy());
      window.setTimeout(() => replayQueued(), 50);
    };
    const onOpen = () => {
      setModalError("");
      const node = dialogRef.current;
      node?.removeAttribute("data-decision-closing");
      showIfWanted();
    };
    window.addEventListener("pf-step-save", onSave);
    window.addEventListener("pf-decision-open", onOpen);
    const timer = window.setInterval(() => {
      if (readDecisionQueue()) replayQueued();
    }, 400);
    return () => {
      window.removeEventListener("pf-step-save", onSave);
      window.removeEventListener("pf-decision-open", onOpen);
      window.clearInterval(timer);
    };
    // The listeners call the latest replay through the closure on each mount of the shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ackChecked() {
    const box = dialogRef.current?.querySelector('[data-decision-ack="1"]');
    if (box instanceof HTMLInputElement) return box.checked;
    return Boolean(boxRef.current?.checked);
  }

  function confirmPending() {
    if (saveBusy || savingRef.current) return;
    savingRef.current = true;
    const form = decisionForm();
    let decision = readPending() || pending;
    if (!decision) {
      savingRef.current = false;
      return;
    }
    const ack = ackChecked();
    const snap = getDecisionDialogSnapshot();
    if (decision === "APPROVED" && snap.showAck && !ack) {
      savingRef.current = false;
      setModalError("Check the box to confirm this approval. Approval was not sent.");
      return;
    }
    const waiting = stepSaveBusy() || !form;
    const queued: QueuedDecision = {
      applicationId: form ? inputValue(form, "applicationId") : snap.applicationId,
      caseId: form ? inputValue(form, "caseId") : snap.caseId,
      decision,
      ack,
      at: Date.now(),
      waiting,
    };
    writeDecisionQueue(queued);
    if (waiting) {
      setModalError(SAVING_STEP);
      setSaveBusy(true);
      return;
    }
    if (!claimDecisionReplay(queued)) {
      savingRef.current = false;
      return;
    }
    setModalError("");
    submitDecision(decision, queued.ack);
  }

  function cancelPending() {
    savingRef.current = false;
    setSaveBusy(false);
    const decision = readPending() || pending;
    clearDecisionQueue();
    clearMemory();
    setPending(null);
    setModalError("");
    closeDialog(true);
    window.dispatchEvent(new CustomEvent("pf-decision-cancel", { detail: decision }));
  }

  return (
    <dialog
      id={DECISION_DIALOG_ID}
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-confirm-title"
      data-pending={showing}
      className="w-[min(100%-2rem,28rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded border border-line bg-paper p-4 shadow-[0_30px_80px_rgba(0,0,0,.28)] backdrop:bg-forest/50"
    >
      <h2 id="decision-confirm-title" className="font-serif text-2xl font-normal text-forest">
        {showing === "DECLINED" ? "Confirm decline" : "Confirm approval"}
      </h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
        {showing === "DECLINED" ? snapshot.declineBody : snapshot.approveBody}
      </p>
      {snapshot.showAck && showing !== "DECLINED" ? (
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
          {saveBusy ? "Saving approval..." : showing === "DECLINED" ? "Decline" : "Approve"}
        </button>
        <button className={`${btnOutline} min-h-12 w-full sm:w-auto`} type="button" data-decision-cancel="1" onClick={cancelPending}>
          Cancel
        </button>
      </div>
    </dialog>
  );
}
