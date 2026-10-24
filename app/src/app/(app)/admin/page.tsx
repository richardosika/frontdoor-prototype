import Link from "next/link";
import { createInvite, reviewVouch } from "@/actions/admin";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, card, field, labelCls } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAwaitingVerification } from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [pending, members, invites, posts, access, vouches, verificationCases, openReports] = await Promise.all([
    prisma.application.count({ where: { status: "PENDING" } }),
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
  ]);
  const awaitingVerification = verificationCases.filter((item) => isAwaitingVerification(item)).length;
  const tierCount = (tier: string) => members.find((row) => row.tier === tier)?._count ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title="Admin" />
      <p className="mt-1 text-sm text-ink">Review applications, set verification tiers, and issue invite codes.</p>
      <div className="mt-4">
        <Banner error={params.error} notice={params.notice} />
      </div>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat href="/admin/applications" label="Pending applications" value={pending} />
        <Stat href="/admin/members" label="Confirmed members" value={tierCount("CONFIRMED")} />
        <Stat href="/deals" label="Open access requests" value={access} />
        <Stat href="/admin/verification" label="Verification awaiting review" value={awaitingVerification} />
        <Stat href="/admin/messages" label="Reports for review" value={openReports} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Mini label="Invited" value={tierCount("INVITED")} />
        <Mini label="Verified" value={tierCount("VERIFIED")} />
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
