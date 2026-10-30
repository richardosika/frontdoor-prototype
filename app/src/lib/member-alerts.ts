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
