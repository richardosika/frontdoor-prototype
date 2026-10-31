/**
 * #44 "My work right now" for every member type except developers: Active (developer projects the member is on),
 * In talks (open requests sent / received, recently accepted), New for you (opportunities not yet contacted).
 */
import { prisma } from "@/lib/prisma";
import { memberCategories, parseSeeking } from "@/lib/project-contact";
import { moneyDigits } from "@/lib/money";

const DAY = 24 * 60 * 60 * 1000;
export const ACCEPTED_IN_TALKS_DAYS = 14;

export type TalkState = "Sent" | "Received" | "Accepted";

/** Pure: which contacts are "in talks" and with what label, newest first. */
export function inTalks<T extends { status: string; fromId: string; createdAt: Date; decidedAt?: Date | null }>(rows: T[], userId: string, now = new Date()): (T & { state: TalkState })[] {
  const out: (T & { state: TalkState })[] = [];
  for (const row of rows) {
    if (row.status === "PENDING") out.push({ ...row, state: row.fromId === userId ? "Sent" : "Received" });
    else if (row.status === "ACCEPTED" && now.getTime() - (row.decidedAt ?? row.createdAt).getTime() <= ACCEPTED_IN_TALKS_DAYS * DAY) out.push({ ...row, state: "Accepted" });
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

/** #44 expanded: the value headline. Total value sums each project's stated value; projects without one add nothing. */
export function valueHeadline(input: { allSeeking: { valueLabel: string }[]; received: { status: string; fromId: string; project: { userId: string } }[] }) {
  const total = input.allSeeking.reduce((sum, p) => sum + (Number(moneyDigits(p.valueLabel || "")) || 0), 0);
  const developers = new Set(input.received.filter((r) => r.status === "PENDING" && r.fromId === r.project.userId).map((r) => r.fromId));
  return { projects: input.allSeeking.length, total, developers: developers.size };
}

export function monthStart(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** #44 expanded: "This month" results, from real data. Deals won = project contacts (not my own projects) accepted this month. */
export async function loadResults(user: { id: string }, allSeeking: { at: Date }[], now = new Date()) {
  const since = monthStart(now);
  const [views, won, network] = await Promise.all([
    prisma.profileView.findMany({ where: { memberId: user.id, createdAt: { gte: since } }, select: { viewerId: true }, distinct: ["viewerId"] }),
    prisma.projectContact.count({
      where: { status: "ACCEPTED", decidedAt: { gte: since }, OR: [{ fromId: user.id }, { toId: user.id }], project: { userId: { not: user.id } } },
    }),
    // #48: nationwide activity for the empty headline (a count only, no project details).
    prisma.trackProject.count({ where: { reviewStatus: "APPROVED", OR: [{ reviewedAt: { gte: since } }, { reviewedAt: null, createdAt: { gte: since } }] } }),
  ]);
  return { shown: allSeeking.filter((p) => p.at >= since).length, views: views.length, won, network };
}

/** #45: right column for non-developers: who viewed you this week, upcoming milestones, unread messages. */
const etDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);

/** #47: distinct viewers per day for the last 7 days (oldest first, today last), in New York days. */
export function viewChart(views: { viewerId: string; createdAt: Date }[], now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() - (6 - i) * DAY);
    const key = etDay(date);
    return { day: key, date, count: new Set(views.filter((v) => etDay(v.createdAt) === key).map((v) => v.viewerId)).size };
  });
}

export async function loadSidePanels(user: { id: string }, active: { id: string; name: string; next: { title: string; dueDate: Date | null } | null; room: { id: string } | null }[], now = new Date()) {
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const activeIds = active.map((a) => a.id);
  const [views, unread, contacts, access, owners, conns] = await Promise.all([
    prisma.profileView.findMany({ where: { memberId: user.id, createdAt: { gte: weekAgo } }, orderBy: { createdAt: "desc" }, select: { viewerId: true, createdAt: true } }),
    prisma.message.findMany({
      where: { readAt: null, senderId: { not: user.id }, conversation: { OR: [{ userAId: user.id }, { userBId: user.id }] } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, body: true, createdAt: true, conversationId: true, sender: { select: { id: true, name: true, org: true } } },
    }),
    activeIds.length ? prisma.projectContact.findMany({ where: { projectId: { in: activeIds }, status: "ACCEPTED" }, select: { projectId: true, fromId: true, toId: true } }) : [],
    activeIds.length ? prisma.dealAccess.findMany({ where: { status: "APPROVED", deal: { projectId: { in: activeIds } } }, select: { requesterId: true, deal: { select: { projectId: true } } } }) : [],
    activeIds.length ? prisma.trackProject.findMany({ where: { id: { in: activeIds } }, select: { id: true, userId: true } }) : [],
    prisma.connection.findMany({ where: { OR: [{ fromId: user.id }, { toId: user.id }] }, select: { fromId: true, toId: true } }),
  ]);
  const viewerIds = [...new Set(views.map((v) => v.viewerId))];
  const lastSeen = new Map<string, Date>();
  for (const v of views) if (!lastSeen.has(v.viewerId)) lastSeen.set(v.viewerId, v.createdAt);
  const viewers = viewerIds.length
    ? await prisma.user.findMany({ where: { id: { in: viewerIds }, status: "ACTIVE" }, select: { id: true, name: true, org: true, role: true, location: true } })
    : [];
  const approved = new Set(viewers.map((v) => v.id));
  const order = new Map(viewerIds.map((id, i) => [id, i]));
  const upcoming = active
    .filter((item) => item.next)
    .map((item) => ({ projectId: item.id, projectName: item.name, title: item.next!.title, dueDate: item.next!.dueDate, roomId: item.room?.id ?? null }))
    .sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity))
    .slice(0, 4);
  // People you may want to work with: approved members on the same projects, not already in your circle.
  const linked = new Set(conns.flatMap((c) => [c.fromId, c.toId]));
  const onProject = new Map<string, string>();
  const add = (id: string, projectId: string | null) => { if (projectId && id !== user.id && !linked.has(id) && !onProject.has(id)) onProject.set(id, projectId); };
  for (const o of owners) add(o.userId, o.id);
  for (const c of contacts) { add(c.fromId, c.projectId); add(c.toId, c.projectId); }
  for (const a of access) add(a.requesterId, a.deal.projectId);
  const names = new Map(active.map((a) => [a.id, a.name]));
  const peopleRows = onProject.size
    ? await prisma.user.findMany({ where: { id: { in: [...onProject.keys()] }, status: "ACTIVE" }, select: { id: true, name: true, org: true, role: true } })
    : [];
  const people = peopleRows.slice(0, 3).map((p) => ({ ...p, projectName: names.get(onProject.get(p.id)!) ?? "" }));
  return {
    viewers: viewers.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)).map((v) => ({ ...v, lastViewed: lastSeen.get(v.id)! })),
    chart: viewChart(views.filter((v) => approved.has(v.viewerId)), now),
    upcoming,
    unread,
    people,
  };
}
