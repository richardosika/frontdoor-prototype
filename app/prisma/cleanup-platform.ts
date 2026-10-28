/**
 * Removes platform QA members and the notices written for them.
 * Markets, asset types, and specialties stay. They are reference data.
 *
 * Dry run (default): npm run db:cleanup-platform
 * Delete:            npm run db:cleanup-platform -- --delete
 *
 * Refuses a Render host. Does not deploy and does not merge.
 * If these TEST rows were the only additions, the mvp baseline is:
 * Members 19, Applications 2, CRM 2 pending / 19 approved, Outbox 12, Verification 37.
 */
import { PrismaClient } from "@prisma/client";
import { BASELINE_CENSUS, PLATFORM_TEST_EMAIL_DOMAIN } from "../src/lib/platform/catalog";
import { localDealStorage } from "../src/lib/storage/local-disk";

const prisma = new PrismaClient();

function assertSafeDatabase() {
  const url = process.env.DATABASE_URL || "";
  if (/onrender\.com|render\.com/i.test(url)) {
    throw new Error("Refusing to change a Render database from this script.");
  }
  const local = /localhost|127\.0\.0\.1/.test(url);
  if (!local && process.env.PLATFORM_SEED_OK !== "1") {
    throw new Error("Set PLATFORM_SEED_OK=1 to clean a database that is not on localhost.");
  }
}

async function main() {
  assertSafeDatabase();
  const remove = process.argv.includes("--delete");
  const users = await prisma.user.findMany({
    where: { email: { endsWith: `@${PLATFORM_TEST_EMAIL_DOMAIN}` } },
    select: { id: true, isTest: true },
  });
  const ids = users.map((user) => user.id);
  const notices = ids.length
    ? await prisma.outboxNotice.count({
        where: { intendedTo: { endsWith: `@${PLATFORM_TEST_EMAIL_DOMAIN}`, mode: "insensitive" } },
      })
    : 0;
  console.log(
    `${remove ? "Deleting" : "Dry run"} ${ids.length} TEST platform members (${users.filter((user) => user.isTest).length} marked isTest) and ${notices} outbox notices.`,
  );
  console.log(
    `Reference rows stay. Baseline after a full restore: members ${BASELINE_CENSUS.members}, applications ${BASELINE_CENSUS.applications}, CRM pending ${BASELINE_CENSUS.crmPending} / approved ${BASELINE_CENSUS.crmApproved}, outbox ${BASELINE_CENSUS.outbox}, verification ${BASELINE_CENSUS.verification}.`,
  );
  const deals = ids.length ? await prisma.deal.findMany({ where: { sponsorId: { in: ids } }, select: { id: true } }) : [];
  const files = deals.length
    ? await prisma.dealDocument.findMany({ where: { dealId: { in: deals.map((deal) => deal.id) }, storageKey: { not: "" } }, select: { storageKey: true } })
    : [];
  console.log(`${remove ? "Deleting" : "Would delete"} ${deals.length} TEST deals and ${files.length} stored files.`);
  if (!remove || !ids.length) return;
  const storage = localDealStorage();
  for (const file of files) {
    await storage.delete(file.storageKey);
  }
  if (deals.length) await prisma.deal.deleteMany({ where: { id: { in: deals.map((deal) => deal.id) } } });
  await prisma.outboxNotice.deleteMany({
    where: { intendedTo: { endsWith: `@${PLATFORM_TEST_EMAIL_DOMAIN}`, mode: "insensitive" } },
  });
  await prisma.user.deleteMany({ where: { id: { in: ids }, isAdmin: false } });
  console.log("TEST platform members removed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Cleanup failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
