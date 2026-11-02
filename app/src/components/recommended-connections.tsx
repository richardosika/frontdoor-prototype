import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { card } from "@/components/ui";
import { serverTx } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { circleIds, staffNameSet } from "@/lib/project-contact-db";
import { parseSeeking } from "@/lib/project-contact";
import { formatReason, NOT_STAFF_WHERE, recommend, type RecProject } from "@/lib/recommendations";
import { roleLabel, roleShort } from "@/lib/roles";

/** Recommended connections with the reason for each, from location, profession or category, and project type. */
export async function RecommendedConnections({ user: viewer }: { user: { id: string } }) {
  const tx = await serverTx();
  const user = await prisma.user.findUnique({ where: { id: viewer.id }, select: { id: true, role: true, location: true, markets: true, assetClasses: true, extraCategories: true } });
  if (!user) return null;
  const projectSelect = { name: true, asset: true, city: true, state: true, location: true, reviewStatus: true, seeking: true, bidRequests: { where: { status: "OPEN" }, select: { template: { select: { category: true } } } } } as const;
  type Row = { name: string; asset: string; city: string; state: string; location: string; reviewStatus: string; seeking: string; bidRequests: { template: { category: string } }[] };
  const toProject = (p: Row): RecProject => ({ ...p, seeking: parseSeeking(p.seeking), bidCategories: p.bidRequests.map((b) => b.template.category) });
  const [projects, circle, others, staff] = await Promise.all([
    prisma.trackProject.findMany({ where: { userId: user.id, reviewStatus: { not: "DECLINED" } }, select: projectSelect }),
    circleIds(user.id),
    prisma.user.findMany({
      where: { status: "ACTIVE", ...NOT_STAFF_WHERE, id: { not: user.id }, paymentStatus: { in: ["PAID", "WAIVED", "NOT_REQUIRED"] } },
      select: { id: true, name: true, initials: true, photoId: true, role: true, org: true, location: true, markets: true, assetClasses: true, extraCategories: true, email: true, isAdmin: true, projects: { where: { reviewStatus: "APPROVED" }, select: projectSelect } },
      take: 400,
      orderBy: { createdAt: "desc" },
    }),
    staffNameSet(),
  ]);
  const seeking = [...new Set(projects.filter((p) => p.reviewStatus === "APPROVED").flatMap((p) => parseSeeking(p.seeking)))];
  const picks = recommend({ ...user, seeking, projects: projects.map(toProject) }, others.map((o) => ({ ...o, projects: o.projects.map(toProject) })), circle, 6, staff);
  if (!picks.length) return null;
  const byId = new Map(others.map((o) => [o.id, o]));
  return (
    <section className={`${card} mt-4 p-4`} data-testid="recommended-connections">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Recommended for you")}</h2>
      <ul className="mt-2 grid gap-3 sm:grid-cols-2">
        {picks.map((pick) => {
          const m = byId.get(pick.id)!;
          return (
            <li key={m.id} className="flex gap-3 rounded border border-line p-3" data-testid="recommended-row">
              <Avatar initials={m.initials} photoId={m.photoId ?? undefined} size="md" />
              <div className="min-w-0">
                <Link href={`/members/${m.id}`} className="font-semibold text-forest underline decoration-brass [overflow-wrap:anywhere]">{m.name}</Link>
                <p className="text-[13px] text-mut [overflow-wrap:anywhere]">{tx(roleShort(roleLabel(m.role)))} · {m.org}</p>
                {pick.line ? <p className="mt-1 text-[13px] text-forest [overflow-wrap:anywhere]" data-testid="recommended-reasons">{formatReason(pick.line, tx)}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
