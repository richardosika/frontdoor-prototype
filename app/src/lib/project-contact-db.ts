import { prisma } from "@/lib/prisma";
import { canDirectMessage } from "@/lib/project-contact";

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
