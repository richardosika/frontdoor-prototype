import Link from "next/link";
import { notFound } from "next/navigation";
import { removeMember, setMemberStatus } from "@/actions/owner";
import { Banner } from "@/components/banner";
import { TierBadge } from "@/components/badge";
import { DemoChip } from "@/components/status-chip";
import { PaymentPanel } from "@/components/payment-admin";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { btn, btnOutline, card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { isDemoRecord } from "@/lib/person-standing";
import { formatAuditTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AdminMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
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
        <div className="mt-3">
          <Banner error={query.error} notice={query.notice} />
        </div>
        <section className={`${card} mt-4 space-y-2 p-4 text-sm`}>
          <div className="flex items-center gap-2">
            <TierBadge tier={member.tier} />
            {member.isAdmin ? <span className="text-[10px] uppercase tracking-wider text-brass">Admin</span> : null}
            {isDemoRecord({ isTest: member.isTest, email: member.email }) ? <DemoChip /> : null}
          </div>
          <p>
            {roleLabel(member.role)} · {member.org} · {member.location}
          </p>
          <p>
            Account {member.status.toLowerCase()}
            {member.deletionRequestedAt ? " · deletion requested" : ""}
          </p>
          <p>{member.email}</p>
          {member.isAdmin ? null : (
            <div className="flex flex-wrap gap-2 pt-2">
              {member.status === "ACTIVE" ? (
                <form action={setMemberStatus}>
                  <input type="hidden" name="userId" value={member.id} />
                  <input type="hidden" name="status" value="DISABLED" />
                  <button className={btnOutline} type="submit">
                    Suspend
                  </button>
                </form>
              ) : (
                <form action={setMemberStatus}>
                  <input type="hidden" name="userId" value={member.id} />
                  <input type="hidden" name="status" value="ACTIVE" />
                  <button className={btn} type="submit">
                    Reinstate
                  </button>
                </form>
              )}
              <form action={removeMember}>
                <input type="hidden" name="userId" value={member.id} />
                <button className={btnOutline} type="submit">
                  Remove member
                </button>
              </form>
            </div>
          )}
          <p>
            <Link href={`/members/${member.id}`} className="underline decoration-brass">
              Member profile
            </Link>
          </p>
        </section>
        <PaymentPanel
          userId={member.id}
          role={member.role}
          status={member.paymentStatus}
          duesCents={member.duesCents}
          renewalAt={member.renewalAt}
          paidAt={member.paidAt}
          paymentMode={member.paymentMode}
          waiverReason={member.waiverReason}
          refundNote={member.refundNote}
          back={`/admin/members/${member.id}`}
        />
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
