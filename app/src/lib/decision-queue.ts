export const STEP_SAVE_KEY = "pf-step-save";
export const DECISION_QUEUE_KEY = "pf-decision-queue";

export type QueuedDecision = {
  applicationId: string;
  caseId: string;
  decision: "APPROVED" | "DECLINED";
  ack: boolean;
  at: number;
  waiting?: boolean;
  replayed?: boolean;
  retried?: boolean;
};

let submittedAt = 0;
let submittedHref = "";

function storage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function markStepSave(): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STEP_SAVE_KEY, String(Date.now()));
  } catch {
    // Private browsing can reject storage. The button still waits on the form status.
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("pf-step-save"));
}

export function clearStepSave(): void {
  const store = storage();
  try {
    store?.removeItem(STEP_SAVE_KEY);
  } catch {
    // Ignore a blocked storage write. The 30s timeout treats a stale flag as finished.
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("pf-step-save"));
}

export function stepSaveBusy(): boolean {
  const store = storage();
  if (!store) return false;
  try {
    const started = Number(store.getItem(STEP_SAVE_KEY) || 0);
    if (!started) return false;
    if (Date.now() - started > 30_000) {
      store.removeItem(STEP_SAVE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function readDecisionQueue(): QueuedDecision | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(DECISION_QUEUE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QueuedDecision;
    if (!parsed || (parsed.decision !== "APPROVED" && parsed.decision !== "DECLINED")) return null;
    if (typeof parsed.applicationId !== "string" || typeof parsed.at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDecisionQueue(queued: QueuedDecision): void {
  const store = storage();
  try {
    store?.setItem(DECISION_QUEUE_KEY, JSON.stringify(queued));
  } catch {
    // The click still submits on this page when storage is blocked.
  }
}

export function clearDecisionQueue(): void {
  const store = storage();
  try {
    store?.removeItem(DECISION_QUEUE_KEY);
  } catch {
    // Nothing left to replay.
  }
  submittedAt = 0;
  submittedHref = "";
}

/** One submit for this click. A step-save navigation may abort it; that case gets one retry. */
export function claimDecisionReplay(queued: QueuedDecision): boolean {
  const href = typeof location === "undefined" ? "" : location.href;
  if (submittedAt === queued.at && submittedHref === href) return false;
  if (submittedAt === queued.at && submittedHref !== href) {
    if (!queued.waiting || queued.retried) return false;
    queued.retried = true;
  }
  submittedAt = queued.at;
  submittedHref = href;
  queued.replayed = true;
  writeDecisionQueue(queued);
  return true;
}
