export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  try {
    const { cleanTestDataFromEnv } = await import("@/lib/clean-test-data");
    await cleanTestDataFromEnv();
  } catch {
    console.error("Could not clean test data");
  }
  const { prepareAdministratorAccounts } = await import("@/lib/admin-account");
  const prepared = await prepareAdministratorAccounts().catch((error) => {
    console.error("Could not prepare administrator accounts", error);
    return null;
  });
  if (prepared) console.log(`ADMIN_ACCOUNTS revoked=${prepared.revoked} owner=${prepared.owner}`);
  const { syncAdminPasswords } = await import("@/lib/admin-password");
  const passwordResult = await syncAdminPasswords().catch((error) => {
    console.error("Could not apply ADMIN_PASSWORD", error);
    return "failed";
  });
  console.log(`ADMIN_PASSWORD result=${passwordResult}`);
  const { sessionCutoffReport } = await import("@/lib/session-gate");
  console.log(sessionCutoffReport(process.env.SESSION_ISSUED_AFTER));
  const { logAdminLoginProbe } = await import("@/lib/admin-account");
  await logAdminLoginProbe().catch(() => {
    console.error("Could not probe administrator sign-in");
  });
  const { rehearseAdminHttpLogin } = await import("@/lib/admin-account");
  rehearseAdminHttpLogin().catch(() => {
    console.error("Could not rehearse administrator sign-in");
  });
  const { logApplicantCensus } = await import("@/lib/live-census");
  await logApplicantCensus().catch(() => {
    console.error("Could not count applicants");
  });
  const { resumeVerificationJobs } = await import("@/lib/verify/queue");
  resumeVerificationJobs().catch((error) => {
    console.error("Could not resume verification jobs", error);
  });
}
