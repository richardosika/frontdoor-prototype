import { after } from "next/server";

const pending = new Set<Promise<void>>();

/**
 * Starts work that must finish even if the browser closes.
 * The promise is already running, and after() keeps a hosted request alive until it settles.
 */
export function runOnServer(work: () => Promise<void>): void {
  const job = work().catch((error) => {
    console.error(error instanceof Error ? error.message : "background work failed");
  });
  pending.add(job);
  void job.finally(() => {
    pending.delete(job);
  });
  try {
    after(() => job);
  } catch {
    // The job is already running outside a request.
  }
}
