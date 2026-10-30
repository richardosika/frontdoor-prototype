import { LISTED_PAYMENT_STATUSES } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { categoryForRole, parseSeeking, rolesForCategory } from "@/lib/project-contact";
import { circleIds } from "@/lib/project-contact-db";
import type { MemberRole } from "@prisma/client";

/** Everything the role-aware top of the Ledger needs: my projects, who they seek, outreach, and projects seeking me. */
export async function loadLedgerProjects(user: { id: string; role: string }) {
  const myCategory = categoryForRole(user.role);
  const circle = await circleIds(user.id);
  const [mine, sent, received, others] = await Promise.all([
    prisma.trackProject.findMany({ where: { userId: user.id }, orderBy: [{ submittedAt: "desc" }] }),
    prisma.projectContact.findMany({
      where: { fromId: user.id },
      include: { project: { select: { id: true, name: true, userId: true } }, to: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.projectContact.findMany({
      where: { toId: user.id },
      include: { project: { select: { id: true, name: true, userId: true } }, from: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.trackProject.findMany({
      where: {
        userId: { not: user.id },
        reviewStatus: "APPROVED",
        user: { status: "ACTIVE", paymentStatus: { in: [...LISTED_PAYMENT_STATUSES] } },
      },
      include: { user: { select: { id: true, name: true, org: true, role: true } } },
      orderBy: { submittedAt: "desc" },
      take: 200,
    }),
  ]);

  const contactKey = (projectId: string, a: string, b: string) => `${projectId}:${[a, b].sort().join(":")}`;
  const contactStatus = new Map<string, string>();
  for (const row of sent) contactStatus.set(contactKey(row.projectId, row.fromId, row.toId), row.status);
  for (const row of received) contactStatus.set(contactKey(row.projectId, row.fromId, row.toId), row.status);

  const wanted = new Set<string>();
  for (const project of mine) if (project.reviewStatus === "APPROVED") for (const id of parseSeeking(project.seeking)) wanted.add(id);
  const roles = [...wanted].flatMap((id) => rolesForCategory(id)) as MemberRole[];
  const candidates = roles.length
    ? await prisma.user.findMany({
        where: { id: { not: user.id }, status: "ACTIVE", isAdmin: false, paymentStatus: { in: [...LISTED_PAYMENT_STATUSES] }, role: { in: roles } },
        select: { id: true, name: true, org: true, role: true },
        orderBy: { name: "asc" },
        take: 200,
      })
    : [];

  const myProjects = mine.map((project) => ({
    ...project,
    seekingIds: parseSeeking(project.seeking),
    lookingFor:
      project.reviewStatus === "APPROVED"
        ? parseSeeking(project.seeking).map((category) => ({
            category,
            members: candidates
              .filter((member) => (rolesForCategory(category) as string[]).includes(member.role))
              .slice(0, 3)
              .map((member) => ({ ...member, status: contactStatus.get(contactKey(project.id, user.id, member.id)) ?? "" })),
          }))
        : [],
  }));

  const seekingMe = myCategory
    ? others
        .filter((project) => parseSeeking(project.seeking).includes(myCategory))
        .slice(0, 6)
        .map((project) => ({ ...project, status: contactStatus.get(contactKey(project.id, user.id, project.userId)) ?? "" }))
    : [];
  const circleShared = others.filter((project) => project.shareWithCircle && circle.has(project.userId)).slice(0, 6);

  return {
    myCategory,
    myProjects,
    sent,
    received: received.map((row) => ({ ...row, ownerIsMe: row.project.userId === user.id, inCircle: circle.has(row.fromId) })),
    acceptedSent: sent.filter((row) => row.status === "ACCEPTED" && row.project.userId === user.id).map((row) => ({ ...row, inCircle: circle.has(row.toId) })),
    seekingMe,
    circleShared,
  };
}
