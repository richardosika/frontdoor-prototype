import Link from "next/link";
import { createInvite, declineInviteRequest, issueInviteForRequest, reviewVouch } from "@/actions/admin";
import { Banner } from "@/components/banner";
import { CopyCode } from "@/components/copy-code";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, card, field, labelCls } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { roleLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { isAwaitingVerification } from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; issued?: string; issuedFor?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const issuedCode = params.issued
    ? await prisma.inviteCode.findUnique({ where: { code: params.issued } })
    : null;
  const [pending, members, invites, posts, access, vouches, verificationCases, openReports, inviteRequests, outbox, testApps, funnel, activeMembers, introductions] = await Promise.all([
    prisma.application.count({ where: { status: { in: ["PENDING", "SUBMITTED", "IN_REVIEW", "NEEDS_INFO"] } } }),
    prisma.user.groupBy({ by: ["tier"], _count: true }),
    prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.post.count(),
    prisma.dealAccess.count({ where: { status: "PENDING" } }),
    prisma.confirmation.findMany({
      where: { status: "CONFIRMED", reviewStatus: "PENDING_ADMIN" },
      include: { project: { include: { user: true } } },
      orderBy: { respondedAt: "desc" },
    }),
    prisma.verificationCase.findMany({ select: { status: true, expiresAt: true } }),
    prisma.report.count(),
    prisma.inviteRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    prisma.outboxNotice.count(),
    prisma.application.count({ where: { isTest: true } }),
    prisma.application.groupBy({ by: ["status"], _count: true }),
    prisma.user.count({ where: { status: "ACTIVE", isAdmin: false } }),
    prisma.introduction.groupBy({ by: ["status"], _count: true }),
  ]);
  const awaitingVerification = verificationCases.filter((item) => isAwaitingVerification(item)).length;
  const tierCount = (tier: string) => members.find((row) => row.tier === tier)?._count ?? 0;
  const statusCount = (status: string) => funnel.find((row) => row.status === status)?._count ?? 0;
  const introCount = (status: string) => introductions.find((row) => row.status === status)?._count ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title="Admin" />
      <p className="mt-1 text-sm text-ink">
        Review applications, set membership tier to Invited or Confirmed, and issue invite codes. The Verified badge is a separate file.{" "}
        <Link href="/admin/sources" className="underline decoration-brass">
          Verification settings
        </Link>
        {" · "}
        <Link href="/admin/audit" className="underline decoration-brass">
          Audit log
        </Link>
      </p>
      <div className="mt-4 space-y-3">
        <Banner error={params.error} notice={params.notice} />
        {issuedCode ? (
          <CopyCode
            code={issuedCode.code}
            caption={`Invite code for ${params.issuedFor || "this request"}. Pass it along. Private Floor does not email codes.`}
          />
        ) : null}
      </div>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Floor</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Mini label="Submitted" value={statusCount("SUBMITTED") + statusCount("PENDING")} />
          <Mini label="In review" value={statusCount("IN_REVIEW") + statusCount("NEEDS_INFO")} />
          <Mini label="Approved" value={statusCount("APPROVED")} />
          <Mini label="Payment due" value={statusCount("PAYMENT_DUE")} />
          <Mini label="Declined" value={statusCount("DECLINED")} />
          <Mini label="Active members" value={activeMembers} />
          <Mini label="Posts" value={posts} />
          <Mini label="Open introductions" value={introCount("PENDING")} />
          <Mini label="Accepted introductions" value={introCount("ACCEPTED")} />
        </div>
      </section>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat href="/admin/applications" label="Open applications" value={pending} />
        <Stat href="/admin/outbox" label="Outbox notices" value={outbox} />
        <Stat href="/admin/test" label="Test applications" value={testApps} />
        <Stat href="/admin/members" label="Confirmed members" value={tierCount("CONFIRMED")} />
        <Stat href="/admin/access" label="Open access requests" value={access} />
        <Stat href="/admin/verification" label="Verification awaiting review" value={awaitingVerification} />
        <Stat href="/admin/moderation" label="Reports for review" value={openReports} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Mini label="Invited" value={tierCount("INVITED") + tierCount("VERIFIED")} />
        <Mini label="Confirmed" value={tierCount("CONFIRMED")} />
        <Mini label="Posts" value={posts} />
      </div>
      <section className={`${card} mt-6 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Vouches waiting for review</h2>
        <p className="mt-1 text-sm text-ink">A counterparty yes does not change a member&apos;s tier until you accept it.</p>
        {vouches.length === 0 ? <p className="mt-3 text-sm text-mut">None waiting.</p> : null}
        <ul className="mt-3 divide-y divide-line">
          {vouches.map((vouch) => (
            <li key={vouch.id} className="py-3 text-sm">
              <b>{vouch.project.user.name}</b>
              <span className="text-mut"> · {vouch.project.name}</span>
              <p className="text-xs text-ink">
                {vouch.counterpartyName} ({vouch.counterpartyEmail}) confirmed.
                {vouch.note ? ` Note: ${vouch.note}` : ""}
              </p>
              <form action={reviewVouch} className="mt-2 flex gap-2">
                <input type="hidden" name="confirmationId" value={vouch.id} />
                <button className={btnOutline} name="decision" value="REJECTED" type="submit">
                  Decline
                </button>
                <button className={btn} name="decision" value="APPROVED" type="submit">
                  Accept vouch
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
      <section className={`${card} mt-6 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Invite requests</h2>
        <p className="mt-1 text-sm text-ink">Approve by issuing a one-use code. The code stays on this screen. Private Floor does not email it.</p>
        {inviteRequests.length === 0 ? <p className="mt-3 text-sm text-mut">None waiting.</p> : null}
        <ul className="mt-3 divide-y divide-line">
          {inviteRequests.map((request) => (
            <li key={request.id} className="py-3 text-sm">
              <b>{request.name}</b>
              <span className="text-mut"> · {request.email}</span>
              <p className="text-xs text-ink">
                {roleLabel(request.role)} · {request.org} · {request.location}
              </p>
              {request.note ? <p className="mt-1 text-xs text-ink">{request.note}</p> : null}
              <div className="mt-2 flex gap-2">
                <form action={issueInviteForRequest}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <button className={btn} type="submit">
                    Issue code
                  </button>
                </form>
                <form action={declineInviteRequest}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <button className={btnOutline} type="submit">
                    Decline
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className={`${card} p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">New invite code</h2>
          <form action={createInvite} className="mt-3 space-y-2">
            <div>
              <label className={labelCls}>Code</label>
              <input name="code" className={field} placeholder="PF-NEW-CODE" required />
            </div>
            <div>
              <label className={labelCls}>Max uses</label>
              <input name="maxUses" type="number" min={1} max={100} defaultValue={5} className={field} />
            </div>
            <div>
              <label className={labelCls}>Note</label>
              <input name="note" className={field} placeholder="Q4 founding invites" />
            </div>
            <button className={btn} type="submit">
              Create code
            </button>
          </form>
        </section>
        <section className={`${card} p-4`}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Invite codes</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {invites.map((invite) => (
              <li key={invite.id} className="py-2">
                <b>{invite.code}</b>
                <span className="block text-xs text-mut">
                  {invite.uses}/{invite.maxUses} used {invite.note ? `· ${invite.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} className={`${card} p-4`}>
      <b className="block font-serif text-3xl font-normal">{value}</b>
      <span className="text-xs uppercase tracking-wider text-mut">{label}</span>
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className={`${card} px-4 py-3`}>
      <b className="font-serif text-xl font-normal">{value}</b>
      <span className="ml-2 text-xs uppercase tracking-wider text-mut">{label}</span>
    </div>
  );
}
