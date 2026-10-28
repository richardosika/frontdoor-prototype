/**
 * Writes one Outbox notice per member who chose a daily digest and has held thread notices.
 * Does not include message text. Refuses a Render host. Does not deploy.
 *
 *   npm run db:message-digest
 */
import { PrismaClient } from "@prisma/client";
import { digestNotice } from "../src/lib/platform/messaging-policy";

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;

function assertSafeDatabase() {
  const url = process.env.DATABASE_URL || "";
  if (/onrender\.com|render\.com/i.test(url)) {
    throw new Error("Refusing to write digest notices on a Render database.");
  }
}

async function main() {
  assertSafeDatabase();
  const now = new Date();
  const prefs = await prisma.notificationPref.findMany({
    where: { messages: "DIGEST" },
    include: { user: { select: { id: true, email: true, status: true, notifyMessages: true } } },
  });
  let written = 0;
  for (const pref of prefs) {
    if (!pref.user.notifyMessages || pref.user.status !== "ACTIVE") continue;
    const held = await prisma.emailThrottle.findMany({
      where: { userId: pref.userId, key: { startsWith: "conv:" }, suppressedCount: { gt: 0 } },
    });
    if (!held.length) continue;
    const digestKey = "digest";
    const prior = await prisma.emailThrottle.findUnique({ where: { userId_key: { userId: pref.userId, key: digestKey } } });
    if (prior && now.getTime() - prior.lastSentAt.getTime() < DAY) continue;
    const mail = digestNotice(`${process.env.APP_URL || "http://localhost:3000"}/messages`);
    await prisma.outboxNotice.create({
      data: {
        intendedTo: pref.user.email,
        deliveredTo: pref.user.email,
        subject: mail.subject,
        body: `Intended recipient: ${pref.user.email}\n\n${mail.text}`,
        templateKey: "message_digest",
      },
    });
    await prisma.emailThrottle.upsert({
      where: { userId_key: { userId: pref.userId, key: digestKey } },
      create: { userId: pref.userId, key: digestKey, lastSentAt: now, suppressedCount: 0 },
      update: { lastSentAt: now, suppressedCount: 0 },
    });
    await prisma.emailThrottle.updateMany({
      where: { userId: pref.userId, key: { startsWith: "conv:" } },
      data: { suppressedCount: 0 },
    });
    written += 1;
  }
  console.log(`Daily digest notices written: ${written}. No message text is included.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Digest failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
