import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { serverTx } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** #47 See all viewers: approved members who viewed your profile in the last 30 days. */
export default async function ViewersPage() {
  const tx = await serverTx();
  const user = await requireUser();
  const since = new Date(Date.now() - 30 * 86400000);
  const views = await prisma.profileView.findMany({ where: { memberId: user.id, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, select: { viewerId: true, createdAt: true } });
  const last = new Map<string, Date>();
  for (const v of views) if (!last.has(v.viewerId)) last.set(v.viewerId, v.createdAt);
  const people = last.size ? await prisma.user.findMany({ where: { id: { in: [...last.keys()] }, status: "ACTIVE" }, select: { id: true, name: true, org: true, role: true, location: true } }) : [];
  people.sort((a, b) => last.get(b.id)!.getTime() - last.get(a.id)!.getTime());
  const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "America/New_York" });
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-3 md:pb-6 md:pt-6 lg:px-8">
      <PageHeader title={tx("Who viewed your profile")} />
      <section className={card} data-testid="viewers-list">
        <p className="text-[14px] text-mut">{tx("Last 30 days. Only approved members are shown.")}</p>
        {people.length === 0 ? <p className="mt-3 text-[15px] text-ink">{tx("No one has viewed your profile yet.")}</p> : null}
        <ul className="mt-2">
          {people.map((p) => (
            <li key={p.id} className="border-t border-line py-3 first:border-t-0" data-testid="viewers-row">
              <Link href={`/members/${p.id}`} className="text-[16px] font-semibold text-forest underline decoration-line [overflow-wrap:anywhere]">{p.name}</Link>
              <span className="block text-[14px] text-mut [overflow-wrap:anywhere]">{[p.org, tx(roleShort(roleLabel(p.role))), p.location].filter(Boolean).join(" · ")}</span>
              <span className="block text-[13px] text-mut">{fmt.format(last.get(p.id)!)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
