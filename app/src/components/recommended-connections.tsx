import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { card } from "@/components/ui";
import { serverTx } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { circleIds } from "@/lib/project-contact-db";
import { parseSeeking } from "@/lib/project-contact";
import { recommend } from "@/lib/recommendations";
import { roleLabel, roleShort } from "@/lib/roles";

/** Recommended connections with the reason for each, from location, profession or category, and project type. */
export async function RecommendedConnections({ user: viewer }: { user: { id: string } }) {
  const tx = await serverTx();
  const user = await prisma.user.findUnique({ where: { id: viewer.id }, select: { id: true, role: true, location: true, markets: true, assetClasses: true, extraCategories: true } });
  if (!user) return null;
  const [projects, circle, others] = await Promise.all([
    prisma.trackProject.findMany({ where: { userId: user.id, reviewStatus: "APPROVED" }, select: { seeking: true } }),
    circleIds(user.id),
    prisma.user.findMany({
      where: { status: "ACTIVE", isAdmin: false, id: { not: user.id }, paymentStatus: { in: ["PAID", "WAIVED", "NOT_REQUIRED"] } },
      select: { id: true, name: true, initials: true, photoId: true, role: true, org: true, location: true, markets: true, assetClasses: true, extraCategories: true },
      take: 400,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const seeking = [...new Set(projects.flatMap((p) => parseSeeking(p.seeking)))];
  const picks = recommend({ ...user, seeking }, others, circle);
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
                <ul className="mt-1 flex flex-wrap gap-1" data-testid="recommended-reasons">
                  {pick.reasons.map((r) => (
                    <li key={r.kind} className="rounded-full border border-[#E9D9B0] bg-[#F6EEDB] px-2 py-0.5 text-[12px] text-forest">
                      {tx(r.text)}{r.value ? `: ${tx(r.value)}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
