/**
 * Removes specific walkthrough rows from the database in DATABASE_URL.
 * It does not wipe members, applications, or invite codes outside that list.
 *
 *   npm run db:cleanup-walkthrough
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMAILS = [
  "walk1024113042d@example.com",
  "walk1024113156m@example.com",
  ...process.argv.slice(2).map((email) => email.trim().toLowerCase()).filter((email) => email.includes("@")),
];
const APPLICATION_NAMES = ["Walker Desktop 3023"];
const INVITE_CODES = ["PF-BZ3Z-LBJN", "PF-53WH-8NTX"];

async function deleteMember(userId: string) {
  await prisma.verificationCheck.updateMany({ where: { reviewerId: userId }, data: { reviewerId: null } });
  await prisma.verificationEvent.updateMany({ where: { actorId: userId }, data: { actorId: null } });
  await prisma.moderationEvent.updateMany({ where: { actorId: userId }, data: { actorId: null } });
  await prisma.application.updateMany({ where: { reviewerId: userId }, data: { reviewerId: null } });
  await prisma.dealEvent.updateMany({ where: { actorId: userId }, data: { actorId: null } });
  await prisma.inviteCode.updateMany({ where: { createdById: userId }, data: { createdById: null } });

  const deals = await prisma.deal.findMany({ where: { sponsorId: userId }, select: { id: true } });
  const dealIds = deals.map((deal) => deal.id);
  if (dealIds.length) {
    await prisma.post.updateMany({ where: { dealId: { in: dealIds } }, data: { dealId: null } });
    await prisma.dealEvent.deleteMany({ where: { dealId: { in: dealIds } } });
    await prisma.dealMessage.deleteMany({ where: { dealId: { in: dealIds }, parentId: { not: null } } });
    await prisma.dealMessage.deleteMany({ where: { dealId: { in: dealIds } } });
    await prisma.dealDocument.deleteMany({ where: { dealId: { in: dealIds } } });
    await prisma.dealAccess.deleteMany({ where: { dealId: { in: dealIds } } });
    await prisma.deal.deleteMany({ where: { id: { in: dealIds } } });
  }

  await prisma.dealAccess.deleteMany({ where: { requesterId: userId } });
  await prisma.dealDocument.deleteMany({ where: { authorId: userId } });
  await prisma.dealMessage.deleteMany({ where: { authorId: userId, parentId: { not: null } } });
  await prisma.dealMessage.deleteMany({ where: { authorId: userId } });

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { id: true },
  });
  const conversationIds = conversations.map((conversation) => conversation.id);
  if (conversationIds.length) {
    await prisma.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
    await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } });
  }
  await prisma.message.deleteMany({ where: { senderId: userId } });
  await prisma.comment.deleteMany({ where: { authorId: userId } });
  await prisma.like.deleteMany({ where: { userId: userId } });
  await prisma.post.deleteMany({ where: { authorId: userId } });

  const applications = await prisma.application.findMany({
    where: { OR: [{ userId }, { email: { in: EMAILS } }] },
    select: { id: true },
  });
  const applicationIds = applications.map((application) => application.id);
  if (applicationIds.length) {
    await prisma.businessCard.deleteMany({ where: { applicationId: { in: applicationIds } } });
    await prisma.application.deleteMany({ where: { id: { in: applicationIds } } });
  }
  await prisma.businessCard.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

async function main() {
  const users = await prisma.user.findMany({
    where: { OR: [{ email: { in: EMAILS } }, { name: { in: APPLICATION_NAMES } }] },
    select: { id: true, email: true, name: true },
  });
  for (const user of users) {
    await deleteMember(user.id);
    console.log(`Removed account ${user.email} (${user.name}).`);
  }
  if (!users.length) console.log("No matching accounts were present.");

  const applications = await prisma.application.findMany({
    where: { OR: [{ email: { in: EMAILS } }, { name: { in: APPLICATION_NAMES } }] },
    select: { id: true, email: true, name: true, status: true },
  });
  for (const application of applications) {
    await prisma.businessCard.deleteMany({ where: { applicationId: application.id } });
    await prisma.application.delete({ where: { id: application.id } });
    console.log(`Removed application ${application.name} <${application.email}> (${application.status}).`);
  }
  if (!applications.length) console.log("No matching applications were present.");

  for (const code of INVITE_CODES) {
    const invite = await prisma.inviteCode.findUnique({
      where: { code },
      include: { applications: { select: { id: true, email: true } }, inviteRequests: { select: { id: true, email: true } } },
    });
    if (!invite) {
      console.log(`Invite code ${code} was not present.`);
      continue;
    }
    const blocking = [
      ...invite.applications.map((item) => item.email),
      ...invite.inviteRequests.map((item) => item.email),
    ];
    if (blocking.length) {
      console.log(`Left invite code ${code} in place. Still referenced by: ${blocking.join(", ")}.`);
      continue;
    }
    await prisma.inviteCode.delete({ where: { id: invite.id } });
    console.log(`Removed unused invite code ${code}.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
