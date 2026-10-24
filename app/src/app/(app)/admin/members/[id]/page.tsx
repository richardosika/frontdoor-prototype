import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { TierBadge } from "@/components/badge";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AdminMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const member = await prisma.user.findUnique({
    where: { id },
    include: { legalAcceptances: { orderBy: { acceptedAt: "desc" } } },
  });
  if (!member) notFound();
  return (
    <div>
      <MobileTitle href="/admin/members" label="Members" title={member.name} />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title={member.name} />
        <AdminNav current="/admin/members" />
        <section className={`${card} mt-4 space-y-2 p-4 text-sm`}>
          <div className="flex items-center gap-2">
            <TierBadge tier={member.tier} />
            {member.isAdmin ? <span className="text-[10px] uppercase tracking-wider text-brass">Admin</span> : null}
            {member.isTest ? <span className="text-[10px] uppercase tracking-wider text-brass">Test</span> : null}
          </div>
          <p>
            {roleLabel(member.role)} · {member.org} · {member.location}
          </p>
          <p>{member.email}</p>
          <p>
            <Link href={`/members/${member.id}`} className="underline decoration-brass">
              Member profile
            </Link>
          </p>
        </section>
        <section className={`${card} mt-4 p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Legal acceptances</h2>
          {member.legalAcceptances.length === 0 ? <p className="mt-2 text-sm text-mut">None recorded on this account.</p> : null}
          <ul className="mt-2 divide-y divide-line text-sm">
            {member.legalAcceptances.map((row) => (
              <li key={row.id} className="py-2">
                {row.document} · {row.version} · {formatAuditTime(row.acceptedAt)}
                <span className="block text-xs text-mut">IP hash {row.ipHash.slice(0, 12) || "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
