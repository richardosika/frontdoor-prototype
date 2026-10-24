import Link from "next/link";
import { introduceMember, respondIntroduction } from "@/actions/social";
import { Avatar } from "@/components/avatar";
import { Banner } from "@/components/banner";
import { VerifiedMark } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, chipOff, chipOn, field } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { ASSET_CLASSES, DEAL_TYPES, US_STATES, directoryMatch } from "@/lib/member-network";
import { prisma } from "@/lib/prisma";
import { isRoleId, ROLES, roleLabel, roleShort } from "@/lib/roles";
import { toPublicVerification, type VerificationStatus } from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string; state?: string; dealType?: string; assetClass?: string; error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const role = params.role && isRoleId(params.role) ? params.role : "";
  const state = params.state && (US_STATES as readonly string[]).includes(params.state) ? params.state : "";
  const dealType = params.dealType && (DEAL_TYPES as readonly string[]).includes(params.dealType) ? params.dealType : "";
  const assetClass = params.assetClass && (ASSET_CLASSES as readonly string[]).includes(params.assetClass) ? params.assetClass : "";
  const rows = await prisma.user.findMany({
    where: { status: "ACTIVE", id: { not: user.id } },
    orderBy: { name: "asc" },
  });
  const members = rows.filter((member) =>
    directoryMatch(
      {
        role: member.role,
        location: member.location,
        markets: member.markets,
        dealTypes: member.dealTypes,
        assetClasses: member.assetClasses,
        name: member.name,
        org: member.org,
        bio: member.bio,
      },
      { role, state, dealType, assetClass, q: params.q },
    ),
  );
  const [introductions, cases] = await Promise.all([
    prisma.introduction.findMany({
      where: {
        OR: [{ fromId: user.id }, { toId: user.id }],
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      include: { from: true, to: true },
    }),
    prisma.verificationCase.findMany({
      where: { userId: { in: members.map((member) => member.id) }, subject: "MEMBER" },
      select: { userId: true, status: true, verifiedAt: true, expiresAt: true, checks: { select: { result: true } } },
    }),
  ]);
  const incoming = introductions.filter((item) => item.toId === user.id && item.status === "PENDING");

  function introFor(id: string) {
    const row = introductions.find((item) => item.fromId === id || item.toId === id);
    if (!row) return "NONE" as const;
    if (row.status === "ACCEPTED") return "ACCEPTED" as const;
    if (row.fromId === user.id) return "PENDING" as const;
    return "INCOMING" as const;
  }

  function badgeFor(id: string) {
    const record = cases.find((item) => item.userId === id);
    return toPublicVerification(record ? { ...record, status: record.status as VerificationStatus } : null);
  }

  const keep = new URLSearchParams();
  if (role) keep.set("role", role);
  if (state) keep.set("state", state);
  if (dealType) keep.set("dealType", dealType);
  if (assetClass) keep.set("assetClass", assetClass);
  if (params.q) keep.set("q", params.q);

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title="Network" />
      <p className="mt-1 text-sm text-ink">Email and phone stay off this directory. Ask for an introduction. The conversation stays inside Private Floor.</p>
      <div className="mt-4">
        <Banner error={params.error} notice={params.notice} />
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
      <form className="grid gap-3 md:grid-cols-4" action="/network">
        {role ? <input type="hidden" name="role" value={role} /> : null}
        <input className={`${field} md:col-span-4`} name="q" defaultValue={params.q || ""} placeholder="Search name, company, or bio" />
        <select name="state" className={field} defaultValue={state}>
          <option value="">Any state</option>
          {US_STATES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select name="dealType" className={field} defaultValue={dealType}>
          <option value="">Any deal type</option>
          {DEAL_TYPES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select name="assetClass" className={field} defaultValue={assetClass}>
          <option value="">Any asset class</option>
          {ASSET_CLASSES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button className={btn} type="submit">
          Filter
        </button>
      </form>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <RoleChip href={linkWithout(keep, "role")} on={!role}>
          All
        </RoleChip>
        {ROLES.map((item) => (
          <RoleChip key={item.id} href={linkWith(keep, "role", item.id)} on={role === item.id}>
            {roleShort(item.label)}
          </RoleChip>
        ))}
      </div>
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
                  <span className="block text-[11px] text-mut">{member.location}</span>
                </span>
              </Link>
              <div className="mt-2">
                <VerifiedMark view={badgeFor(member.id)} />
              </div>
              {member.lookingFor ? <p className="mt-2 line-clamp-2 text-xs text-ink">{member.lookingFor}</p> : null}
              <div className="mt-3">
                {intro === "ACCEPTED" ? (
                  <Link href={`/members/${member.id}`} className={`${btnOutline} w-full`}>
                    Open messages
                  </Link>
                ) : intro === "PENDING" ? (
                  <span className={`${btn} w-full bg-mut`}>Introduction requested</span>
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

function linkWith(base: URLSearchParams, key: string, value: string) {
  const next = new URLSearchParams(base);
  next.set(key, value);
  return `/network?${next}`;
}

function linkWithout(base: URLSearchParams, key: string) {
  const next = new URLSearchParams(base);
  next.delete(key);
  const value = next.toString();
  return value ? `/network?${value}` : "/network";
}

function RoleChip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={on ? chipOn : chipOff}>
      {children}
    </Link>
  );
}
