import Link from "next/link";
import { redirect } from "next/navigation";
import { introduceMember, respondIntroduction } from "@/actions/social";
import { Avatar } from "@/components/avatar";
import { Banner } from "@/components/banner";
import { VerifiedMark } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { ProjectFilterBar } from "@/components/project-filters";
import { btn, btnOutline, chipOff, chipOn, field } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { assetBySlug, legacyAssetSlugs, THIN_MARKET_MIN } from "@/lib/platform/catalog";
import { planLocationBackfill, homeBaseLabel } from "@/lib/platform/backfill";
import { searchDirectory, type DirectoryPerson } from "@/lib/platform/directory";
import { populationWhere, resultWhere, stateScopeWhere } from "@/lib/platform/directory-query";
import { projectQuery, settleProjectQuery } from "@/lib/project-filter";
import { prisma } from "@/lib/prisma";
import { ROLES, roleLabel, roleShort } from "@/lib/roles";
import { toPublicVerification, type VerificationStatus } from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const settled = settleProjectQuery("/network", params, "network");
  if (settled.redirectTo) redirect(settled.redirectTo);
  const filters = settled.filters;
  const role = filters.role || "";
  const directoryFilter = {
    role: filters.role,
    group: filters.group,
    state: filters.state,
    metro: filters.metro,
    asset: filters.assetClass,
    specialty: filters.specialty,
    size: filters.size,
    dealType: filters.dealType,
    need: filters.need,
    q: filters.q,
    place: filters.place,
    verified: filters.verified,
    sort: filters.sort,
  };
  const stateScope = stateScopeWhere(directoryFilter);
  const [saved, localCount, stateCount] = await Promise.all([
    prisma.savedFilter.findMany({
      where: { userId: user.id, surface: "network" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.user.count({ where: populationWhere(directoryFilter) }),
    stateScope
      ? prisma.user.count({
          where: {
            AND: [
              populationWhere({ role: directoryFilter.role, group: directoryFilter.group }),
              stateScope,
            ],
          },
        })
      : Promise.resolve(0),
  ]);
  let widened: "none" | "state" | "nationwide" = "none";
  if ((directoryFilter.metro || directoryFilter.state) && localCount < THIN_MARKET_MIN) {
    widened = directoryFilter.metro ? (stateCount < THIN_MARKET_MIN ? "nationwide" : "state") : "nationwide";
  }
  const rows = await prisma.user.findMany({
    where: resultWhere(user.id, directoryFilter, widened),
    include: {
      memberMarkets: { include: { market: true } },
      assetFocus: { include: { assetType: true } },
      specialties: { include: { specialty: true } },
      memberVerification: { select: { status: true, verifiedAt: true, expiresAt: true, checks: { select: { result: true } } } },
    },
  });
  const people: DirectoryPerson[] = rows.map((member) => {
    const parsed = planLocationBackfill(member);
    const homeState = member.memberMarkets.find((row) => row.relation === "HOME" && row.market.kind === "STATE")?.market.code || parsed.homeState;
    const homeMetro = member.memberMarkets.find((row) => row.relation === "HOME" && row.market.kind === "METRO")?.market.code || parsed.homeMetro || "";
    const badge = toPublicVerification(
      member.memberVerification
        ? { ...member.memberVerification, status: member.memberVerification.status as VerificationStatus }
        : null,
    );
    return {
      id: member.id,
      role: member.role,
      name: member.name,
      initials: member.initials,
      org: member.org,
      bio: member.bio,
      location: member.location,
      markets: member.markets,
      dealTypes: member.dealTypes,
      assetClasses: member.assetClasses,
      checkSize: member.checkSize,
      lookingFor: member.lookingFor,
      offering: member.offering,
      nationwide: member.nationwide,
      homeCity: member.homeCity || parsed.homeCity,
      homeState,
      homeMetro,
      operateStates: member.memberMarkets.filter((row) => row.relation === "OPERATES" && row.market.kind === "STATE").map((row) => row.market.code),
      operateMetros: member.memberMarkets.filter((row) => row.relation === "OPERATES" && row.market.kind === "METRO").map((row) => row.market.code),
      operateCounties: member.memberMarkets.filter((row) => row.relation === "OPERATES" && row.market.kind === "COUNTY").map((row) => row.market.code),
      assetSlugs: member.assetFocus.length ? member.assetFocus.map((row) => row.assetType.slug) : legacyAssetSlugs(member.assetClasses),
      specialtySlugs: member.specialties.map((row) => row.specialty.slug),
      verified: badge.showBadge,
      createdAt: member.createdAt,
      completeness: [member.bio, member.homeCity, homeState, member.lookingFor, member.offering, member.checkSize].filter((item) => item.trim()).length,
    };
  });
  const directory = searchDirectory(people, directoryFilter, { local: localCount, statePop: stateCount });
  const members = directory.rows;
  const badges = new Map(
    rows.map((member) => [
      member.id,
      toPublicVerification(
        member.memberVerification
          ? { ...member.memberVerification, status: member.memberVerification.status as VerificationStatus }
          : null,
      ),
    ]),
  );
  const introductions = await prisma.introduction.findMany({
    where: {
      OR: [{ fromId: user.id }, { toId: user.id }],
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    include: { from: true, to: true },
  });
  const incoming = introductions.filter((item) => item.toId === user.id && item.status === "PENDING");

  function introFor(id: string) {
    const row = introductions.find((item) => item.fromId === id || item.toId === id);
    if (!row) return "NONE" as const;
    if (row.status === "ACCEPTED") return "ACCEPTED" as const;
    if (row.fromId === user.id) return "PENDING" as const;
    return "INCOMING" as const;
  }

  function badgeFor(id: string) {
    return badges.get(id) ?? toPublicVerification(null);
  }

  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title="Network" />
      <p className="mt-1 text-sm text-ink">Email and phone stay off this directory. Ask for an introduction. The conversation stays inside Private Floor.</p>
      <div className="mt-4">
        <Banner error={error} notice={notice} />
      </div>
      {incoming.length ? (
        <section className="mb-4 rounded border border-brass bg-brass-soft p-4">
          <h2 className="text-sm font-semibold">Introduction requests</h2>
          <ul className="mt-2 space-y-3">
            {incoming.map((item) => (
              <li key={item.id} className="text-sm">
                <span className="font-semibold">{item.from.name}</span>
                <span className="text-mut"> · {roleShort(roleLabel(item.from.role))}</span>
                <p className="mt-1 text-ink">{item.note}</p>
                <span className="mt-2 flex gap-2">
                  <form action={respondIntroduction}>
                    <input type="hidden" name="introductionId" value={item.id} />
                    <button className={btnOutline} name="decision" value="DECLINED" type="submit">
                      Decline
                    </button>
                  </form>
                  <form action={respondIntroduction}>
                    <input type="hidden" name="introductionId" value={item.id} />
                    <button className={btn} name="decision" value="ACCEPTED" type="submit">
                      Accept
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <ProjectFilterBar path="/network" filters={filters} saved={saved} />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <RoleChip href={projectQuery("/network", { ...filters, role: undefined })} on={!role}>
          All
        </RoleChip>
        {ROLES.map((item) => (
          <RoleChip key={item.id} href={projectQuery("/network", { ...filters, role: item.id })} on={role === item.id}>
            {roleShort(item.label)}
          </RoleChip>
        ))}
      </div>
      {directory.banner ? <p className="mt-3 font-serif text-lg text-forest">{directory.banner}</p> : null}
      <p className="mt-3 text-xs text-mut">{directory.showCount ? directory.countLabel : "Growing market"}</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => {
          const intro = introFor(member.id);
          return (
            <article key={member.id} className="rounded border border-line bg-paper p-4">
              <Link href={`/members/${member.id}`} className="flex items-center gap-3">
                <Avatar initials={member.initials} />
                <span>
                  <span className="block text-sm font-semibold">{member.name}</span>
                  <span className="block text-[11px] text-mut">
                    {roleShort(roleLabel(member.role))} · {member.org}
                  </span>
                  <span className="block text-[11px] text-mut">{homeBaseLabel(member)}</span>
                </span>
              </Link>
              <div className="mt-2">
                <VerifiedMark view={badgeFor(member.id)} />
              </div>
              {member.reason ? <p className="mt-2 text-[11px] text-mut">{member.reason}</p> : null}
              {member.assetSlugs.length ? (
                <p className="mt-2 flex flex-wrap gap-1">
                  {member.assetSlugs.slice(0, 3).map((slug) => (
                    <span key={slug} className="rounded-sm border border-line bg-cream px-2 py-0.5 text-[11px] text-ink">
                      {assetBySlug(slug)?.label ?? slug}
                    </span>
                  ))}
                </p>
              ) : null}
              {member.nationwide ? <p className="mt-2 text-[11px] font-semibold text-forest">Works nationwide</p> : null}
              {member.lookingFor ? <p className="mt-2 line-clamp-2 text-xs text-ink">{member.lookingFor}</p> : null}
              <div className="mt-3">
                {intro === "ACCEPTED" ? (
                  <Link href={`/members/${member.id}`} className={`${btnOutline} w-full`}>
                    Open messages
                  </Link>
                ) : intro === "PENDING" ? (
                  <p className="rounded border border-line bg-cream px-3 py-2 text-sm text-ink">
                    Introduction requested. It stays inside Private Floor until they accept.
                  </p>
                ) : intro === "INCOMING" ? (
                  <Link href={`/members/${member.id}`} className={`${btn} w-full`}>
                    Respond
                  </Link>
                ) : (
                  <form action={introduceMember} className="grid gap-2">
                    <input type="hidden" name="userId" value={member.id} />
                    <input type="hidden" name="back" value="/network" />
                    <textarea name="note" className={field} rows={2} placeholder="Short note" required />
                    <button className={btn} type="submit">
                      Request introduction
                    </button>
                  </form>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {members.length === 0 ? <p className="mt-6 text-sm text-mut">No members match those filters.</p> : null}
    </div>
  );
}

function RoleChip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={on ? chipOn : chipOff}>
      {children}
    </Link>
  );
}
