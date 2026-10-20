import { setMemberTier } from "@/actions/admin";
import { Banner } from "@/components/banner";
import { TierBadge } from "@/components/badge";
import { btn, field } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { TIERS } from "@/lib/domain";
import { tierLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function MembersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const members = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8">
      <h1 className="font-serif text-2xl font-normal">Members</h1>
      <p className="mt-1 text-sm text-ink">Set Invited, Verified, or Confirmed. Counterparty vouches also promote a member to Confirmed.</p>
      <div className="mt-3">
        <Banner error={params.error} notice={params.notice} />
      </div>
      <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white">
        {members.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {member.name} <TierBadge tier={member.tier} />
                {member.isAdmin ? <span className="text-[10px] uppercase tracking-wider text-terra">Admin</span> : null}
              </div>
              <p className="text-xs text-mut">
                {roleShort(roleLabel(member.role))} · {member.org} · {member.email}
              </p>
            </div>
            <form action={setMemberTier} className="flex items-center gap-2">
              <input type="hidden" name="userId" value={member.id} />
              <select name="tier" defaultValue={member.tier} className={field}>
                {TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tierLabel(tier)}
                  </option>
                ))}
              </select>
              <button className={btn} type="submit">
                Save
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
