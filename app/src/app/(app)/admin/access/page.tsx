import Link from "next/link";
import { adminReviewAccess } from "@/actions/deals";
import { Banner } from "@/components/banner";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { btn, btnOutline, card } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { formatAuditTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [requests, introductions] = await Promise.all([
    prisma.dealAccess.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      requester: { select: { name: true, role: true } },
      deal: { select: { id: true, title: true, sponsor: { select: { name: true } } } },
    },
    }),
    prisma.introduction.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        from: { select: { name: true } },
        to: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div>
      <MobileTitle href="/admin" label="Admin" title="Access" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:py-6 lg:px-8">
        <PageHeader title="Introductions and deal rooms" />
        <p className="mt-1 text-sm text-ink">
          Pending introductions stay with the member who received them. Deal-room requests can be decided here for the sponsor.
        </p>
        <section className="mt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Pending introductions</h2>
          {introductions.length === 0 ? <p className="mt-3 text-sm text-mut">No introductions waiting.</p> : null}
          <ul className="mt-3 space-y-3">
            {introductions.map((intro) => (
              <li key={intro.id} className={`${card} p-4 text-sm`}>
                <p className="font-serif text-xl font-normal">
                  {intro.from.name} → {intro.to.name}
                </p>
                {intro.note ? <p className="mt-1 text-ink">{intro.note}</p> : null}
                <p className="text-xs text-mut">Requested {formatAuditTime(intro.createdAt)}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-brass">Waiting on {intro.to.name}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="mt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Deal-room requests</h2>
          <p className="mt-1 text-sm text-ink">
            Pending requests, including ones sent to a sponsor you are not signed in as. Approving acts for that sponsor and tells the requester an admin decided.
          </p>
        <div className="mt-3">
          <Banner error={params.error} notice={params.notice} />
        </div>
        {requests.length === 0 ? <p className="mt-6 text-sm text-mut">No access requests waiting.</p> : null}
        <ul className="mt-4 space-y-3">
          {requests.map((access) => (
            <li key={access.id} className={`${card} p-4 text-sm`}>
              <p className="font-serif text-xl font-normal">{access.deal.title}</p>
              <p className="mt-1 text-ink">
                <b>{access.requester.name}</b>
                <span className="text-mut"> · {roleShort(roleLabel(access.requester.role))}</span>
              </p>
              <p className="text-ink">
                Sponsor: {access.deal.sponsor.name}
                {access.ndaAcknowledged ? " · NDA acknowledged" : " · NDA missing"}
              </p>
              <p className="text-xs text-mut">Requested {formatAuditTime(access.createdAt)}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-brass">Pending — not approved</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/deals/${access.deal.id}`} className={btnOutline}>
                  Open deal
                </Link>
                <form action={adminReviewAccess}>
                  <input type="hidden" name="accessId" value={access.id} />
                  <button className={btnOutline} name="decision" value="REJECTED" type="submit">
                    Decline
                  </button>
                </form>
                <form action={adminReviewAccess}>
                  <input type="hidden" name="accessId" value={access.id} />
                  <button className={btn} name="decision" value="APPROVED" type="submit" disabled={!access.ndaAcknowledged}>
                    Approve for {access.deal.sponsor.name}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        </section>
      </div>
    </div>
  );
}
