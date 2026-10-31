/**
 * #44 "My work right now" for every member type except developers: Active (developer projects the member is on),
 * In talks (open requests sent / received, recently accepted), New for you (opportunities not yet contacted).
 */
import { prisma } from "@/lib/prisma";
import { memberCategories, parseSeeking } from "@/lib/project-contact";

const DAY = 24 * 60 * 60 * 1000;
export const ACCEPTED_IN_TALKS_DAYS = 14;

export type TalkState = "Sent" | "Received" | "Accepted";

/** Pure: which contacts are "in talks" and with what label, newest first. */
export function inTalks<T extends { status: string; fromId: string; createdAt: Date; respondedAt?: Date | null }>(rows: T[], userId: string, now = new Date()): (T & { state: TalkState })[] {
  const out: (T & { state: TalkState })[] = [];
  for (const row of rows) {
    if (row.status === "PENDING") out.push({ ...row, state: row.fromId === userId ? "Sent" : "Received" });
    else if (row.status === "ACCEPTED" && now.getTime() - (row.respondedAt ?? row.createdAt).getTime() <= ACCEPTED_IN_TALKS_DAYS * DAY) out.push({ ...row, state: "Accepted" });
  }
  return out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function loadMyWork(user: { id: string; role: string; extraCategories?: string | null }, newForYou: number) {
  const mine = memberCategories(user);
  const [contacts, access] = await Promise.all([
    prisma.projectContact.findMany({
      where: { OR: [{ fromId: user.id }, { toId: user.id }] },
      include: {
        project: { select: { id: true, name: true, userId: true, seeking: true, location: true, user: { select: { id: true, name: true, org: true } } } },
        from: { select: { id: true, name: true } },
        to: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.dealAccess.findMany({
      where: { requesterId: user.id, status: "APPROVED" },
      select: { deal: { select: { id: true, title: true, projectId: true } } },
    }),
  ]);
  const others = contacts.filter((row) => row.project.userId !== user.id);
  const roomByProject = new Map(access.filter((a) => a.deal.projectId).map((a) => [a.deal.projectId as string, a.deal]));
  const activeIds = [...new Set([...others.filter((r) => r.status === "ACCEPTED").map((r) => r.projectId), ...roomByProject.keys()])];
  const projects = activeIds.length
    ? await prisma.trackProject.findMany({
        where: { id: { in: activeIds } },
        select: { id: true, name: true, seeking: true, location: true, user: { select: { id: true, name: true, org: true } } },
      })
    : [];
  const rooms = [...roomByProject.values()];
  const milestones = rooms.length
    ? await prisma.dealChecklistItem.findMany({
        where: { dealId: { in: rooms.map((r) => r.id) }, status: { not: "DONE" } },
        select: { dealId: true, title: true, dueDate: true },
        orderBy: [{ dueDate: "asc" }, { position: "asc" }],
      })
    : [];
  const next = new Map<string, { title: string; dueDate: Date | null }>();
  for (const item of milestones) {
    const have = next.get(item.dealId);
    if (!have || (!have.dueDate && item.dueDate)) next.set(item.dealId, { title: item.title, dueDate: item.dueDate });
  }
  const active = projects.map((project) => {
    const room = roomByProject.get(project.id);
    return {
      id: project.id,
      name: project.name,
      location: project.location,
      developer: project.user,
      myRole: parseSeeking(project.seeking).find((id) => mine.includes(id)) ?? mine[0] ?? null,
      room: room ? { id: room.id, title: room.title } : null,
      next: room ? next.get(room.id) ?? null : null,
    };
  });
  return { active, talks: inTalks(others, user.id).slice(0, 8), newForYou };
}
