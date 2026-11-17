import { prisma } from "@/lib/prisma";

type RoomDeal = {
  id: string;
  title: string;
  createdAt: Date;
  project: { name: string } | null;
};
type OwnedDeal = RoomDeal & { _count: { access: number } };
type RoomAccess = {
  status: string;
  createdAt: Date;
  deal: Omit<RoomDeal, "createdAt"> & { sponsor: { id: string; name: string } };
};
export type DealRoomRow = {
  id: string;
  name: string;
  owner: { id: string; name: string } | null;
  state: "OWNER" | "APPROVED" | "PENDING";
  pendingRequests: number;
  href: string;
};

export function buildDealRoomRows(userId: string, owned: readonly OwnedDeal[], access: readonly RoomAccess[]): DealRoomRow[] {
  const ownedIds = new Set(owned.map((deal) => deal.id));
  const rows: (DealRoomRow & { timestamp: number })[] = owned.map((deal) => ({
    id: deal.id,
    name: deal.project?.name || deal.title,
    owner: null,
    state: "OWNER",
    pendingRequests: deal._count.access,
    href: `/deals/${deal.id}/room`,
    timestamp: deal.createdAt.getTime(),
  }));
  for (const entry of access) {
    const { deal, status } = entry;
    if (ownedIds.has(deal.id) || deal.sponsor.id === userId || (status !== "APPROVED" && status !== "PENDING")) continue;
    rows.push({
      id: deal.id,
      name: deal.project?.name || deal.title,
      owner: deal.sponsor,
      state: status,
      pendingRequests: 0,
      href: status === "APPROVED" ? `/deals/${deal.id}/room` : `/deals/${deal.id}`,
      timestamp: entry.createdAt.getTime(),
    });
  }
  const rank = { OWNER: 0, APPROVED: 1, PENDING: 2 };
  return rows.sort((a, b) => rank[a.state] - rank[b.state] || b.timestamp - a.timestamp)
    .map(({ timestamp: _timestamp, ...row }) => row);
}

export async function loadMyDealRooms(user: { id: string }): Promise<DealRoomRow[]> {
  const [owned, access] = await Promise.all([
    prisma.deal.findMany({
      where: { sponsorId: user.id },
      select: {
        id: true, title: true, createdAt: true, project: { select: { name: true } },
        _count: { select: { access: { where: { status: "PENDING" } } } },
      },
    }),
    prisma.dealAccess.findMany({
      where: { requesterId: user.id, status: { in: ["APPROVED", "PENDING"] } },
      select: {
        status: true, createdAt: true,
        deal: { select: { id: true, title: true, project: { select: { name: true } }, sponsor: { select: { id: true, name: true } } } },
      },
    }),
  ]);
  return buildDealRoomRows(user.id, owned, access);
}
