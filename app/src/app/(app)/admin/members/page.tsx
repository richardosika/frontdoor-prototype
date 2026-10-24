import { setMemberTier } from "@/actions/admin";
import { Banner } from "@/components/banner";
import { TierBadge } from "@/components/badge";
import { MobileTitle, PageHeader } from "@/components/page-header";
import { btn, card, field } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { MEMBERSHIP_TIERS, membershipTier } from "@/lib/domain";
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
    <div>
      <MobileTitle href="/admin" label="Admin" title="Members" />
      <div className="mx-auto max-w-4xl px-4 py-4 md:py-6 lg:px-8">
      <PageHeader title="Members" />
      <p className="mt-1 text-sm text-ink">Membership tier is Invited or Confirmed. Confirmed requires an accepted vouch. The brass Verified badge is a separate committee file.</p>
      <div className="mt-3">
        <Banner error={params.error} notice={params.notice} />
      </div>
      <ul className={`mt-4 divide-y divide-line ${card}`}>
        {members.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {member.name} <TierBadge tier={member.tier} />
                {member.isAdmin ? <span className="text-[10px] uppercase tracking-wider text-brass">Admin</span> : null}
              </div>
              <p className="text-xs text-mut">
                {roleShort(roleLabel(member.role))} · {member.org} · {member.email}
                {member.phone ? ` · ${member.phone}` : ""}
                {member.linkedinUrl ? ` · ${member.linkedinUrl}` : ""}
              </p>
            </div>
            <form action={setMemberTier} className="flex items-center gap-2">
              <input type="hidden" name="userId" value={member.id} />
              <select name="tier" defaultValue={membershipTier(member.tier)} className={field}>
                {MEMBERSHIP_TIERS.map((tier) => (
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
    </div>
  );
}
