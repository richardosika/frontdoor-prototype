import { prisma } from "@/lib/prisma";

/** Deletes a non-admin member and the rows that would block the user delete. Administrators are left in place. */
export async function deleteMemberAccount(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true, email: true },
  });
  if (!user || user.isAdmin) return false;
  await prisma.$transaction(async (tx) => {
    await tx.application.updateMany({ where: { userId }, data: { userId: null } });
    await tx.application.updateMany({ where: { reviewerId: userId }, data: { reviewerId: null } });
    await tx.inviteCode.updateMany({ where: { createdById: userId }, data: { createdById: null } });
    await tx.verificationCheck.updateMany({ where: { reviewerId: userId }, data: { reviewerId: null } });
    await tx.verificationEvent.updateMany({ where: { actorId: userId }, data: { actorId: null } });
    await tx.applicationDecision.updateMany({ where: { actorId: userId }, data: { actorId: null } });
    await tx.dealEvent.updateMany({ where: { actorId: userId }, data: { actorId: null } });
    await tx.moderationEvent.updateMany({ where: { actorId: userId }, data: { actorId: null } });
    await tx.businessCard.updateMany({ where: { userId }, data: { userId: null } });
    await tx.crmPerson.deleteMany({ where: { OR: [{ userId }, { email: user.email }] } });
    await tx.dealMessage.deleteMany({ where: { authorId: userId } });
    await tx.dealDocument.deleteMany({ where: { authorId: userId } });
    await tx.message.deleteMany({ where: { senderId: userId } });
    await tx.conversation.deleteMany({ where: { OR: [{ userAId: userId }, { userBId: userId }] } });
    await tx.connection.deleteMany({ where: { OR: [{ fromId: userId }, { toId: userId }] } });
    await tx.dealAccess.deleteMany({ where: { requesterId: userId } });
    const deals = await tx.deal.findMany({ where: { sponsorId: userId }, select: { id: true } });
    if (deals.length) {
      const dealIds = deals.map((deal) => deal.id);
      await tx.post.updateMany({ where: { dealId: { in: dealIds } }, data: { dealId: null } });
      await tx.deal.deleteMany({ where: { id: { in: dealIds } } });
    }
    const projects = await tx.trackProject.findMany({ where: { userId }, select: { id: true } });
    if (projects.length) {
      await tx.verificationRun.deleteMany({ where: { projectId: { in: projects.map((project) => project.id) } } });
    }
    await tx.user.delete({ where: { id: userId } });
  });
  return true;
}
