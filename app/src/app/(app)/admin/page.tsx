import Link from "next/link";
import { createInvite } from "@/actions/admin";
import { Banner } from "@/components/banner";
import { btn, field, labelCls } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [pending, members, invites, posts, access] = await Promise.all([
    prisma.application.count({ where: { status: "PENDING" } }),
    prisma.user.groupBy({ by: ["tier"], _count: true }),
    prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.post.count(),
    prisma.dealAccess.count({ where: { status: "PENDING" } }),
  ]);
  const tierCount = (tier: string) => members.find((row) => row.tier === tier)?._count ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8">
      <h1 className="font-serif text-[26px] uppercase tracking-[0.16em]">Admin</h1>
      <p className="mt-1 text-sm text-ink">Review applications, set verification tiers, and issue invite codes.</p>
      <div className="mt-4">
        <Banner error={params.error} notice={params.notice} />
      </div>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        <Stat href="/admin/applications" label="Pending applications" value={pending} />
        <Stat href="/admin/members" label="Confirmed members" value={tierCount("CONFIRMED")} />
        <Stat href="/deals" label="Open access requests" value={access} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Mini label="Invited" value={tierCount("INVITED")} />
        <Mini label="Verified" value={tierCount("VERIFIED")} />
        <Mini label="Posts" value={posts} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terra">New invite code</h2>
          <form action={createInvite} className="mt-3 space-y-2">
            <div>
              <label className={labelCls}>Code</label>
              <input name="code" className={field} placeholder="FD-NEW-CODE" required />
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
        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terra">Invite codes</h2>
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
    <Link href={href} className="rounded-2xl border border-line bg-white p-4">
      <b className="block font-serif text-3xl font-normal">{value}</b>
      <span className="text-xs uppercase tracking-wider text-mut">{label}</span>
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3">
      <b className="font-serif text-xl font-normal">{value}</b>
      <span className="ml-2 text-xs uppercase tracking-wider text-mut">{label}</span>
    </div>
  );
}
