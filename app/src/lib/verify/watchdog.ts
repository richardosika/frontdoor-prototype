/** A live run is usually done in about a minute. Longer than this is treated as stuck. */
export const STUCK_RUN_MS = 3 * 60 * 1000;

export function watchdogRetryCount(error: string): number {
  const match = /^watchdog-retry:(\d+)/.exec(error);
  return match ? Number(match[1]) : 0;
}

export function stuckRunDecision(
  run: { status: string; startedAt: Date | null; createdAt: Date; error: string },
  now = new Date(),
): "wait" | "retry" | "fail" {
  if (run.status !== "RUNNING" && run.status !== "PENDING") return "wait";
  const since = run.startedAt ?? run.createdAt;
  if (now.getTime() - since.getTime() < STUCK_RUN_MS) return "wait";
  return watchdogRetryCount(run.error) >= 1 ? "fail" : "retry";
}
