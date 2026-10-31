import { prisma } from "@/lib/prisma";
import { canRequestDealRoom, dealSeekingCategories } from "@/lib/project-contact";
import { canMessagePair } from "@/lib/project-contact-db";
import { inferNeed } from "@/lib/project-filter";

/** Whether a member may request access to a deal room. Used by the action (enforced) and the page (shown). */
export
async function dealRoomRule(
  deal: { id: string; sponsorId: string; need: string; roleNeeded: string | null; projectId: string | null },
  user: { id: string; role: string; extraCategories?: string | null; isAdmin: boolean },
) {
  if (user.isAdmin) return { ok: true as const };
  const [post, project] = await Promise.all([
    prisma.post.findFirst({ where: { dealId: deal.id }, select: { need: true, intent: true }, orderBy: { createdAt: "desc" } }),
    deal.projectId ? prisma.trackProject.findUnique({ where: { id: deal.projectId }, select: { seeking: true } }) : null,
  ]);
  const categories = dealSeekingCategories({
    need: inferNeed({ need: post?.need || deal.need, intent: post?.intent, roleNeeded: deal.roleNeeded }),
    roleNeeded: deal.roleNeeded,
    projectSeeking: project?.seeking,
  });
  return canRequestDealRoom({ categories, requesterRole: user.role, requesterExtra: user.extraCategories, related: await canMessagePair(user.id, deal.sponsorId) });
}
