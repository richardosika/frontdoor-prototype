import { prisma } from "@/lib/prisma";
import { STARTER_CHECKLIST } from "@/lib/deal-checklist";

/** Sponsor, approved room members, and staff. Returns who is asking and whether they can manage the list. */
export async function checklistRoom(dealId: string, user: { id: string; isAdmin: boolean }) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { access: { where: { status: "APPROVED" }, select: { requesterId: true } } },
  });
  if (!deal) return null;
  const member = deal.sponsorId === user.id || deal.access.some((item) => item.requesterId === user.id);
  if (!member && !user.isAdmin) return null;
  const memberIds = [deal.sponsorId, ...deal.access.map((item) => item.requesterId)];
  return { deal, manage: deal.sponsorId === user.id || user.isAdmin, memberIds };
}

/** Creates the starter checklist the first time the sponsor or staff opens it. */
export async function ensureStarterChecklist(dealId: string) {
  const count = await prisma.dealChecklistItem.count({ where: { dealId } });
  if (count > 0) return;
  await prisma.dealChecklistItem.createMany({
    data: STARTER_CHECKLIST.map((item, position) => ({ dealId, section: item.section, title: item.title, category: item.category, position })),
  });
}

