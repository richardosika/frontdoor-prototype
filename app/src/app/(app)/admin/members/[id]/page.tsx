import Link from "next/link";
import { notFound } from "next/navigation";
import { setMessagingRestriction } from "@/actions/messaging-admin";
import { removeMember, setMemberStatus } from "@/actions/owner";
import { Banner } from "@/components/banner";
import { TierBadge } from "@/components/badge";
import { DemoChip } from "@/components/status-chip";
import { PaymentPanel } from "@/components/payment-admin";
import { ConfirmSubmitButton } from "@/components/run-and-reload";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { btn, btnOutline, card, field, labelCls } from "@/components/ui";
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
    include: { legalAcceptances: { orderBy: { acceptedAt: "desc" } }, restrictions: { orderBy: { createdAt: "desc" }, take: 8 } },
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
              <form id={`remove-member-${member.id}`} action={removeMember}>
                <input type="hidden" name="userId" value={member.id} />
              </form>
              <ConfirmSubmitButton
                form={`remove-member-${member.id}`}
                className={btnOutline}
                message={`Remove ${member.name}? This deletes the member account, the application, the CRM person, and the outbox notices for this email, including the application code, welcome, and payment receipt. This cannot be undone.`}
              >
                Remove member
              </ConfirmSubmitButton>
            </div>
          )}
          <p>
            <Link href={`/members/${member.id}`} className="underline decoration-brass">
              Member profile
            </Link>
          </p>
        </section>
        {member.isAdmin ? null : (
          <section className={`${card} mt-4 p-4 text-sm`}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Messaging</h2>
            <p className="mt-2 text-ink">Pause or suspend messaging for this member. The audit log records the reason. This does not change membership.</p>
            {member.restrictions.length ? (
              <ul className="mt-2 space-y-1 text-ink">
                {member.restrictions.map((row) => (
                  <li key={row.id}>
                    {row.kind === "MESSAGING_PAUSED" ? "Messaging paused" : "Messaging suspended"} · {row.reason}
                    {row.endsAt ? ` · until ${formatAuditTime(row.endsAt)}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-mut">No messaging restriction.</p>
            )}
            <form action={setMessagingRestriction} className="mt-3 grid gap-2">
              <input type="hidden" name="userId" value={member.id} />
              <label>
                <span className={labelCls}>Action</span>
                <select name="kind" className={field} defaultValue="MESSAGING_PAUSED">
                  <option value="MESSAGING_PAUSED">Pause messaging</option>
                  <option value="MESSAGING_SUSPENDED">Suspend messaging</option>
                </select>
              </label>
              <label>
                <span className={labelCls}>Reason</span>
                <input name="reason" className={field} minLength={3} />
              </label>
              <label>
                <span className={labelCls}>End date, optional</span>
                <input name="endsOn" type="date" className={field} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button className={btn} type="submit">
                  Save restriction
                </button>
                <button className={btnOutline} name="clear" value="1" type="submit">
                  Clear messaging restrictions
                </button>
              </div>
            </form>
          </section>
        )}
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
