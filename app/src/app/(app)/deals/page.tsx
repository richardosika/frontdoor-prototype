import Link from "next/link";
import { redirect } from "next/navigation";
import { Banner } from "@/components/banner";
import { KindTag, TierBadge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { ProjectFilterBar } from "@/components/project-filters";
import { chipOff, chipOn, dealCard } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { matchScore } from "@/lib/domain";
import { postIsPublic } from "@/lib/member-network";
import { prisma } from "@/lib/prisma";
import {
  filterSummary,
  inferNeed,
  needLabel,
  narrowProjects,
  projectQuery,
  settleProjectQuery,
  sortProjects,
  stageLabel,
} from "@/lib/project-filter";
import { ROLES, roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const settled = settleProjectQuery("/deals", params, "deals");
  if (settled.redirectTo) redirect(settled.redirectTo);
  const filters = settled.filters;
  const [dealRows, posts, saved] = await Promise.all([
    prisma.deal.findMany({
      orderBy: { createdAt: "desc" },
      include: { sponsor: true },
    }),
    prisma.post.findMany({
      where: { dealId: { not: null } },
      select: { dealId: true, status: true, closedAt: true, expiresAt: true },
    }),
    prisma.savedFilter.findMany({
      where: { userId: user.id, surface: "deals" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);
  const hidden = new Set(posts.filter((post) => post.dealId && !postIsPublic(post)).map((post) => post.dealId));
  const deals = dealRows.filter((deal) => !hidden.has(deal.id));
  const filtered = sortProjects(
    narrowProjects(
      deals.map((deal) => ({
        ...deal,
        sponsorRole: deal.sponsor.role,
        sponsorName: deal.sponsor.name,
      })),
      filters,
    ).map((deal) => ({
      ...deal,
      match: matchScore({
        memberRole: user.role,
        memberLocation: user.location,
        deal: { kind: deal.kind, roleNeeded: deal.roleNeeded, sponsorRole: deal.sponsorRole, market: deal.market },
      }),
    })),
    filters.sort,
  );
  const summary = filterSummary(filters);
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

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
      <Banner error={error} notice={notice} />
      <ProjectFilterBar path="/deals" filters={filters} saved={saved} />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <FilterChip href={projectQuery("/deals", { ...filters, role: undefined })} on={!filters.role}>
          All roles
        </FilterChip>
        {ROLES.map((item) => (
          <FilterChip key={item.id} href={projectQuery("/deals", { ...filters, role: item.id })} on={filters.role === item.id}>
            {roleShort(item.label)}
          </FilterChip>
        ))}
      </div>
      <p className="mt-4 text-xs text-mut">
        {filtered.length} result{filtered.length === 1 ? "" : "s"}
        {summary ? ` · ${summary}` : ""}
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
            const stage = stageLabel(deal.stage);
            const need = needLabel(inferNeed(deal));
            return (
              <Link key={deal.id} href={`/deals/${deal.id}`} className={`flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-card ${dealCard}`}>
                <div className="flex items-center justify-between gap-2">
                  <KindTag kind={deal.kind} roleLabel={roleShort(roleLabel(deal.roleNeeded))} />
                  <span className="text-xs font-semibold text-brass">{deal.match}% match</span>
                </div>
                <h2 className="mt-2 font-serif text-[17px] font-normal leading-snug">{deal.title}</h2>
                <p className="mt-1 flex items-center gap-2 text-xs text-mut">
                  {deal.sponsorName} <TierBadge tier={deal.sponsor.tier} />
                </p>
                <p className="mt-2 flex-1 text-[13px] text-ink">{deal.blurb}</p>
                <p className="mt-2 text-xs text-mut">
                  {[deal.assetClass, stage, need].filter(Boolean).join(" · ")}
                </p>
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
