import { prisma } from "@/lib/prisma";
import { NOT_STAFF_WHERE } from "@/lib/recommendations";
import { subMatchesPackage } from "@/lib/trades";

/** Nov 6: active, paid-up subcontractors with this trade who serve one of the package's states. */
export async function matchingSubs(pkg: { trade: string; serviceStates: string }, excludeIds: string[] = []) {
  const rows = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      ...NOT_STAFF_WHERE,
      paymentStatus: { in: ["PAID", "WAIVED", "NOT_REQUIRED"] },
      id: { notIn: excludeIds },
      OR: [{ role: "SUBCONTRACTOR" }, { extraCategories: { contains: "SUBCONTRACTOR" } }],
      trades: { contains: pkg.trade },
    },
    select: { id: true, email: true, locale: true, name: true, org: true, role: true, extraCategories: true, trades: true, markets: true, location: true },
    take: 500,
  });
  return rows.filter((u) => subMatchesPackage(u, pkg));
}

/** Open trade packages a subcontractor can bid on (matching trade and area), newest first. */
export async function openPackagesFor(viewer: { id: string; role: string; extraCategories: string; trades: string; markets: string; location: string }) {
  const rows = await prisma.bidRequest.findMany({
    where: { status: "OPEN", dueAt: { gt: new Date() }, requesterId: { not: viewer.id }, trade: { not: "" } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      project: { select: { id: true, name: true, location: true } },
      requester: { select: { id: true, name: true, org: true, role: true } },
      template: { select: { name: true, version: true } },
      _count: { select: { plans: true } },
    },
  });
  return rows.filter((r) => subMatchesPackage(viewer, { trade: r.trade, serviceStates: r.serviceStates }));
}
