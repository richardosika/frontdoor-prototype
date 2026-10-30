import { prisma } from "@/lib/prisma";
import { canDirectMessage, projectAudienceIds } from "@/lib/project-contact";

/** Member ids in the user's circle (accepted connections), not including the user. */
export async function circleIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.connection.findMany({
    where: { status: "ACCEPTED", OR: [{ fromId: userId }, { toId: userId }] },
    select: { fromId: true, toId: true },
  });
  return new Set(rows.map((row) => (row.fromId === userId ? row.toId : row.fromId)));
}

export async function pairRelation(a: string, b: string) {
  const pair = [
    { fromId: a, toId: b },
    { fromId: b, toId: a },
  ];
  const [connection, intro, contact, block, admins] = await Promise.all([
    prisma.connection.findFirst({ where: { status: "ACCEPTED", OR: pair }, select: { id: true } }),
    prisma.introduction.findFirst({ where: { status: "ACCEPTED", OR: pair }, select: { id: true } }),
    prisma.projectContact.findFirst({ where: { status: "ACCEPTED", OR: pair }, select: { id: true } }),
    prisma.block.findFirst({
      where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
      select: { id: true },
    }),
    prisma.user.count({ where: { id: { in: [a, b] }, isAdmin: true } }),
  ]);
  return {
    inCircle: Boolean(connection),
    introAccepted: Boolean(intro),
    contactAccepted: Boolean(contact),
    blocked: Boolean(block),
    adminInvolved: admins > 0,
  };
}

/** Server-side check for direct messages and circle requests. */
export async function canMessagePair(a: string, b: string): Promise<boolean> {
  return canDirectMessage(await pairRelation(a, b));
}

/** Member ids involved in a project (see projectAudienceIds). */
export async function projectAudience(projectId: string): Promise<string[]> {
  const project = await prisma.trackProject.findUnique({
    where: { id: projectId },
    select: {
      userId: true,
      shareWithCircle: true,
      contacts: { where: { status: "ACCEPTED" }, select: { fromId: true, toId: true } },
      deals: { select: { access: { where: { status: "APPROVED" }, select: { requesterId: true } } } },
    },
  });
  if (!project) return [];
  const circle = project.shareWithCircle ? [...(await circleIds(project.userId))] : [];
  return projectAudienceIds({
    ownerId: project.userId,
    acceptedContacts: project.contacts,
    shareWithCircle: project.shareWithCircle,
    circle,
    dealMembers: project.deals.flatMap((deal) => deal.access.map((row) => row.requesterId)),
  });
}

/** Whether a viewer may open a project's documents. */
export async function canViewProjectDocuments(projectId: string, viewer: { id: string; isAdmin: boolean }): Promise<boolean> {
  const project = await prisma.trackProject.findUnique({ where: { id: projectId }, select: { userId: true, reviewStatus: true } });
  if (!project) return false;
  if (viewer.isAdmin || project.userId === viewer.id) return true;
  if (project.reviewStatus !== "APPROVED") return false;
  return (await projectAudience(projectId)).includes(viewer.id);
}
