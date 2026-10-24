export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { resumeVerificationJobs } = await import("@/lib/verify/queue");
  resumeVerificationJobs().catch((error) => {
    console.error("Could not resume verification jobs", error);
  });
}
