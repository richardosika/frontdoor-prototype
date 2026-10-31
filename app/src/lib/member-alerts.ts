import { LISTED_PAYMENT_STATUSES } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { categoryForRole, parseSeeking } from "@/lib/project-contact";

/** Notifications that belong on a member's Alerts page. Staff notices stay in Admin. */
export function memberAlertWhere(userId: string) {
  return { userId, audience: "member", NOT: { href: { startsWith: "/admin" } } };
}

export const NEW_MEMBER_ALERT_TITLE = "New member matches your projects";

/** Pure: which owners' approved projects seek the new member's category. Owner id -> project names. */
export function matchNewMember(
  member: { id: string; role: string },
  projects: { userId: string; name: string; seeking: string; reviewStatus: string }[],
): Map<string, string[]> {
  const category = categoryForRole(member.role);
  const out = new Map<string, string[]>();
  if (!category) return out;
  for (const project of projects) {
    if (project.userId === member.id || project.reviewStatus !== "APPROVED") continue;
    if (!parseSeeking(project.seeking).includes(category)) continue;
    out.set(project.userId, [...(out.get(project.userId) ?? []), project.name]);
  }
  return out;
}

/** Alert every member whose approved projects seek the new member's category, once per new member. */
export async function alertNewMemberMatches(memberId: string): Promise<number> {
  const member = await prisma.user.findUnique({ where: { id: memberId }, select: { id: true, name: true, role: true, org: true, status: true, paymentStatus: true, isAdmin: true } });
  if (!member || member.status !== "ACTIVE" || member.isAdmin || !(LISTED_PAYMENT_STATUSES as readonly string[]).includes(member.paymentStatus)) return 0;
  const projects = await prisma.trackProject.findMany({
    where: { reviewStatus: "APPROVED", seeking: { not: "" }, user: { status: "ACTIVE" } },
    select: { userId: true, name: true, seeking: true, reviewStatus: true },
  });
  const matches = matchNewMember(member, projects);
  const href = `/members/${member.id}`;
  let sent = 0;
  for (const [ownerId, names] of matches) {
    const already = await prisma.notification.count({ where: { userId: ownerId, href, title: NEW_MEMBER_ALERT_TITLE } });
    if (already) continue;
    await prisma.notification.create({
      data: { userId: ownerId, audience: "member", title: NEW_MEMBER_ALERT_TITLE, body: `${member.name} · ${member.org} · ${names.join(", ")}`, href },
    });
    sent += 1;
  }
  return sent;
}

export const NEW_PROJECT_ALERT_TITLE = "New project seeking your category";

/**
 * Overnight: when staff approve a project (or the owner adds a category), alert every approved member in the
 * categories it seeks, once per project. Email follows each member's "new matches" setting.
 */
export async function alertProjectSeekers(projectId: string, onlyCategories?: string[]): Promise<number> {
  const project = await prisma.trackProject.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, seeking: true, reviewStatus: true, userId: true, location: true, asset: true, user: { select: { name: true, org: true } } },
  });
  if (!project || project.reviewStatus !== "APPROVED") return 0;
  const { rolesForCategory } = await import("@/lib/project-contact");
  const categories = parseSeeking(project.seeking).filter((id) => !onlyCategories || onlyCategories.includes(id));
  const roles = categories.flatMap((id) => rolesForCategory(id));
  if (!roles.length) return 0;
  const people = await prisma.user.findMany({
    where: { id: { not: project.userId }, status: "ACTIVE", isAdmin: false, paymentStatus: { in: [...LISTED_PAYMENT_STATUSES] }, role: { in: roles as never[] } },
    select: { id: true, email: true, locale: true, notifyMatches: true },
  });
  const href = `/projects/${project.id}`;
  let sent = 0;
  for (const person of people) {
    if (await prisma.notification.count({ where: { userId: person.id, href, title: NEW_PROJECT_ALERT_TITLE } })) continue;
    const body = `${project.name} · ${project.user.name}${project.user.org ? ` (${project.user.org})` : ""} · ${project.location}`;
    await prisma.notification.create({ data: { userId: person.id, audience: "member", title: NEW_PROJECT_ALERT_TITLE, body, href } });
    if (person.notifyMatches) {
      const [{ sendEmail }, { appBaseUrl }, { phrase }, { isLocale }] = await Promise.all([import("@/lib/email"), import("@/lib/url"), import("@/lib/i18n/phrases"), import("@/lib/i18n/messages")]);
      const locale = isLocale(person.locale) ? person.locale : "en";
      const p = (text: string) => phrase(locale, text);
      await sendEmail({
        to: person.email,
        subject: `${p(NEW_PROJECT_ALERT_TITLE)}: ${project.name}`,
        text: `${p("An approved project on Private Floor is seeking your category.")}\n\n${body}\n\n${p("Open the project")}\n${await appBaseUrl()}${href}`,
      });
    }
    sent += 1;
  }
  return sent;
}
