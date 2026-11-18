import { factScore } from "@/lib/project-facts";
import { LISTED_PAYMENT_STATUSES } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { categoryMemberWhere, interestCategories, memberCategories, memberInCategory, parseSeeking } from "@/lib/project-contact";
import { circleIds } from "@/lib/project-contact-db";
import type { MemberRole } from "@prisma/client";
import { matchesSlimFilters, type SlimFilters } from "@/lib/member-reach";
import { opportunityOwnerRoles, subCanSee } from "@/lib/sub-access";

/** Everything the role-aware top of the Ledger needs: my projects, who they seek, outreach, and projects seeking me. */
export async function loadLedgerProjects(user: { id: string; role: string; extraCategories?: string | null }, options: { filters?: SlimFilters; limit?: number; hideDismissed?: boolean; receivedLimit?: number } = {}) {
  const limit = options.limit ?? 6;
  const keep = (project: { asset: string; state: string; location: string; valueLabel: string }) => !options.filters || matchesSlimFilters(project, options.filters);
  const myCategories = memberCategories(user);
  const myCategory = myCategories[0] ?? null;
  const circle = await circleIds(user.id);
  // Nov 10: the X in Opportunities removes a project from Opportunities and the Ledger; the Ledger X only from the Ledger.
  const [ledgerGone, oppGone] = await Promise.all([
    options.hideDismissed ? prisma.ledgerDismissal.findMany({ where: { userId: user.id }, select: { projectId: true } }) : Promise.resolve([] as { projectId: string }[]),
    prisma.opportunityDismissal.findMany({ where: { userId: user.id }, select: { projectId: true } }),
  ]);
  const dismissed = new Set([...ledgerGone, ...oppGone].map((row) => row.projectId));
  const [mine, sent, received, others] = await Promise.all([
    prisma.trackProject.findMany({ where: { userId: user.id }, orderBy: [{ submittedAt: "desc" }] }),
    prisma.projectContact.findMany({
      where: { fromId: user.id },
      include: { project: { select: { id: true, name: true, userId: true } }, to: { select: { id: true, name: true, role: true, org: true, location: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.projectContact.findMany({
      where: { toId: user.id },
      include: {
        project: { select: { id: true, name: true, userId: true, asset: true, location: true, city: true, state: true, year: true, seeking: true } },
        from: { select: { id: true, name: true, role: true, org: true, location: true } },
      },
      // Nov 6: requests still waiting come first so none is cut off by the limit.
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: options.receivedLimit ?? 20,
    }),
    prisma.trackProject.findMany({
      where: {
        userId: { not: user.id },
        reviewStatus: "APPROVED",
        // Nov 5: a member blocked by the owner does not see the owner's projects.
        user: { status: "ACTIVE", paymentStatus: { in: [...LISTED_PAYMENT_STATUSES] }, blocksMade: { none: { blockedId: user.id } } },
      },
      include: { user: { select: { id: true, name: true, org: true, role: true, location: true } } },
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
  const candidates = wanted.size
    ? await prisma.user.findMany({
        where: { id: { not: user.id }, status: "ACTIVE", isAdmin: false, paymentStatus: { in: [...LISTED_PAYMENT_STATUSES] }, ...(categoryMemberWhere([...wanted]) as object) },
        select: { id: true, name: true, org: true, role: true, location: true, extraCategories: true },
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
              .filter((member) => memberInCategory(member, category))
              .slice(0, 3)
              .map((member) => ({ ...member, status: contactStatus.get(contactKey(project.id, user.id, member.id)) ?? "" })),
          }))
        : [],
  }));

  // #42: the category of mine each project seeks (first match in my order), so multi-category members see every match.
  // Nov 6: subcontractors also see developer projects seeking a General Contractor (interest only, no full GC bid).
  const interestCats = interestCategories(user);
  // Nov 10 (Julia): subs see projects from general contractors and architects, never from developers.
  const ownerRoles = opportunityOwnerRoles(user);
  const matchOf = (project: { seeking: string }) => myCategories.find((id) => parseSeeking(project.seeking).includes(id)) ?? interestCats.find((id) => parseSeeking(project.seeking).includes(id)) ?? null;
  const seekingMe = myCategories.length
    ? others
        // #44: only developer projects seek people; a non-developer's past work never matches.
        .filter((project) => ownerRoles.includes(project.user.role) && matchOf(project) && keep(project) && !dismissed.has(project.id))
        // Overnight: projects that give this member type the facts it needs come first, then newest.
        .sort((a, b) => factScore(matchOf(b)!, b) - factScore(matchOf(a)!, a))
        .slice(0, limit)
        .map((project) => ({ ...project, matchedCategory: matchOf(project), status: contactStatus.get(contactKey(project.id, user.id, project.userId)) ?? "" }))
    : [];
  const seekingIds = new Set(seekingMe.map((project) => project.id));
  const circleShared = others
    .filter((project) => project.shareWithCircle && circle.has(project.userId) && !seekingIds.has(project.id) && keep(project) && subCanSee(user, project.user))
    .slice(0, limit);

  return {
    myCategory,
    myCategories,
    // #44 expanded: every approved developer project seeking one of my categories (ignores filters), for the headline.
    allSeeking: others
      .filter((project) => ownerRoles.includes(project.user.role) && matchOf(project))
      .map((project) => ({ id: project.id, valueLabel: project.valueLabel, at: project.reviewedAt ?? project.submittedAt, matchedCategory: matchOf(project) })),
    // #44: approved projects seeking me that I have not contacted yet (all of them, not only the first few shown).
    newForYou: others.filter((project) => ownerRoles.includes(project.user.role) && matchOf(project) && !contactStatus.get(contactKey(project.id, user.id, project.userId))).length,
    myProjects,
    sent,
    received: received.map((row) => ({ ...row, ownerIsMe: row.project.userId === user.id, inCircle: circle.has(row.fromId) })),
    acceptedSent: sent.filter((row) => row.status === "ACCEPTED" && row.project.userId === user.id).map((row) => ({ ...row, inCircle: circle.has(row.toId) })),
    seekingMe,
    circleShared,
  };
}

/**
 * "Find your team" for developers: approved members in each category the developer's approved projects seek, with
 * their profile basics, past work, and the outreach status for that specific project.
 */
export async function loadFindTeam(user: { id: string }) {
  const projects = await prisma.trackProject.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, seeking: true, reviewStatus: true, asset: true, location: true },
    orderBy: { submittedAt: "desc" },
  });
  const open = projects.filter((project) => project.reviewStatus === "APPROVED" && parseSeeking(project.seeking).length > 0);
  const wantedIds = [...new Set(open.flatMap((project) => parseSeeking(project.seeking)))];
  const [members, contacts] = await Promise.all([
    wantedIds.length
      ? prisma.user.findMany({
          where: { id: { not: user.id }, status: "ACTIVE", isAdmin: false, paymentStatus: { in: [...LISTED_PAYMENT_STATUSES] }, ...(categoryMemberWhere(wantedIds) as object) },
          select: {
            extraCategories: true,
            id: true,
            name: true,
            initials: true,
            photoId: true,
            org: true,
            role: true,
            location: true,
            bio: true,
            offering: true,
            projects: { where: { reviewStatus: "APPROVED" }, select: { id: true, name: true, asset: true, year: true, location: true }, orderBy: { year: "desc" }, take: 3 },
          },
          orderBy: { name: "asc" },
          take: 300,
        })
      : [],
    prisma.projectContact.findMany({
      where: { OR: [{ fromId: user.id }, { toId: user.id }], projectId: { in: open.map((project) => project.id) } },
      select: { projectId: true, fromId: true, toId: true, status: true },
    }),
  ]);
  const status = new Map<string, string>();
  for (const row of contacts) status.set(`${row.projectId}:${row.fromId === user.id ? row.toId : row.fromId}`, row.status);
  return {
    pending: projects.filter((project) => project.reviewStatus !== "APPROVED"),
    noSeeking: projects.filter((project) => project.reviewStatus === "APPROVED" && parseSeeking(project.seeking).length === 0),
    projects: open.map((project) => ({
      ...project,
      groups: parseSeeking(project.seeking).map((category) => ({
        category,
        members: members
          .filter((member) => memberInCategory(member, category))
          .map((member) => ({ ...member, status: status.get(`${project.id}:${member.id}`) ?? "" })),
      })),
    })),
  };
}

/**
 * "My Circle": only people connected to the member through a project (an accepted project contact) or an accepted
 * circle connection, with the projects they share and whether a conversation is open.
 */
export async function loadMyCircle(user: { id: string }) {
  const [contacts, connections, conversations] = await Promise.all([
    prisma.projectContact.findMany({
      where: { status: "ACCEPTED", OR: [{ fromId: user.id }, { toId: user.id }] },
      select: { fromId: true, toId: true, project: { select: { id: true, name: true } } },
    }),
    prisma.connection.findMany({ where: { status: "ACCEPTED", OR: [{ fromId: user.id }, { toId: user.id }] }, select: { fromId: true, toId: true } }),
    prisma.conversation.findMany({ where: { OR: [{ userAId: user.id }, { userBId: user.id }] }, select: { id: true, userAId: true, userBId: true } }),
  ]);
  const shared = new Map<string, Map<string, string>>();
  const add = (id: string) => {
    if (!shared.has(id)) shared.set(id, new Map());
    return shared.get(id)!;
  };
  for (const row of contacts) add(row.fromId === user.id ? row.toId : row.fromId).set(row.project.id, row.project.name);
  for (const row of connections) add(row.fromId === user.id ? row.toId : row.fromId);
  // Nov 5: people this member removed from My Circle (without blocking) stay out of it.
  const removed = await prisma.circleRemoval.findMany({ where: { userId: user.id }, select: { removedId: true } });
  for (const row of removed) shared.delete(row.removedId);
  const ids = [...shared.keys()];
  if (ids.length === 0) return [];
  const people = await prisma.user.findMany({
    where: { id: { in: ids }, status: "ACTIVE" },
    select: { id: true, name: true, initials: true, photoId: true, role: true, org: true, location: true },
    orderBy: { name: "asc" },
  });
  const ownShared = await prisma.trackProject.findMany({
    where: { userId: { in: ids }, reviewStatus: "APPROVED", shareWithCircle: true },
    select: { id: true, name: true, userId: true },
  });
  return people.map((person) => {
    const projects = shared.get(person.id) ?? new Map<string, string>();
    for (const project of ownShared) if (project.userId === person.id) projects.set(project.id, project.name);
    const conversation = conversations.find((row) => row.userAId === person.id || row.userBId === person.id);
    return { ...person, projects: [...projects].map(([id, name]) => ({ id, name })), conversationId: conversation?.id ?? "" };
  });
}
