import Link from "next/link";
import { Banner } from "@/components/banner";
import { KindTag, TierBadge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { chipOff, chipOn, dealCard, field } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { filterDeals, matchScore, sizeLabel } from "@/lib/domain";
import { dealsQuery } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROLES, roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; market?: string; size?: string; q?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const role = params.role && ROLES.some((item) => item.id === params.role) ? params.role : undefined;
  const market = params.market === "NJ" || params.market === "NY" || params.market === "CT" ? params.market : undefined;
  const size = params.size === "under-1" || params.size === "1-5" || params.size === "5+" ? params.size : undefined;
  const deals = await prisma.deal.findMany({
    orderBy: { createdAt: "desc" },
    include: { sponsor: true },
  });
  const filtered = filterDeals(
    deals.map((deal) => ({
      ...deal,
      sponsorRole: deal.sponsor.role,
      sponsorName: deal.sponsor.name,
    })),
    { role, market, size, query: params.q },
  );

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader
        title="Deals"
        action={
          <Link href="/feed" className="text-sm font-semibold text-brass">
            Post a deal
          </Link>
        }
      />
      <Banner error={params.error} />
      <form className="mt-4 max-w-xl" action="/deals">
        {role ? <input type="hidden" name="role" value={role} /> : null}
        {market ? <input type="hidden" name="market" value={market} /> : null}
        {size ? <input type="hidden" name="size" value={size} /> : null}
        <input className={field} name="q" defaultValue={params.q || ""} placeholder="Search deals, markets, members" />
      </form>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <FilterChip href={dealsQuery({ market, size, q: params.q })} on={!role}>
          All roles
        </FilterChip>
        {ROLES.map((item) => (
          <FilterChip key={item.id} href={dealsQuery({ role: item.id, market, size, q: params.q })} on={role === item.id}>
            {roleShort(item.label)}
          </FilterChip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(["Any", "NJ", "NY", "CT"] as const).map((item) => (
          <FilterChip key={item} href={dealsQuery({ role, market: item === "Any" ? null : item, size, q: params.q })} on={(market || "Any") === item}>
            Market: {item}
          </FilterChip>
        ))}
        {(["Any", "under-1", "1-5", "5+"] as const).map((item) => (
          <FilterChip key={item} href={dealsQuery({ role, market, size: item === "Any" ? null : item, q: params.q })} on={(size || "Any") === item}>
            Size: {item === "Any" ? "Any" : sizeLabel(item)}
          </FilterChip>
        ))}
      </div>
      <p className="mt-4 text-xs text-mut">
        {filtered.length} result{filtered.length === 1 ? "" : "s"}
      </p>
      {filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-mut">
          No deals match these filters.
          <div>
            <Link href="/deals" className="mt-3 inline-block font-semibold text-forest">
              Clear filters
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((deal) => {
            const score = matchScore({
              memberRole: user.role,
              memberLocation: user.location,
              deal: { kind: deal.kind, roleNeeded: deal.roleNeeded, sponsorRole: deal.sponsorRole, market: deal.market },
            });
            return (
              <Link key={deal.id} href={`/deals/${deal.id}`} className={`flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-card ${dealCard}`}>
                <div className="flex items-center justify-between gap-2">
                  <KindTag kind={deal.kind} roleLabel={roleShort(roleLabel(deal.roleNeeded))} />
                  <span className="text-xs font-semibold text-brass">{score}% match</span>
                </div>
                <h2 className="mt-2 font-serif text-[17px] font-normal leading-snug">{deal.title}</h2>
                <p className="mt-1 flex items-center gap-2 text-xs text-mut">
                  {deal.sponsorName} <TierBadge tier={deal.sponsor.tier} />
                </p>
                <p className="mt-2 flex-1 text-[13px] text-ink">{deal.blurb}</p>
                <div className="mt-3 flex gap-3 border-t border-line pt-3 text-xs text-mut">
                  <span>
                    <b className="text-forest">{deal.raiseLabel}</b>
                  </span>
                  <span>
                    <b className="text-forest">{deal.kind === "DEAL" ? deal.targetIrr || "—" : deal.deadline || "Open"}</b>
                  </span>
                  <span>
                    <b className="text-forest">{deal.market}</b>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={on ? chipOn : chipOff}>
      {children}
    </Link>
  );
}
