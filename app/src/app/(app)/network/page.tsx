import Link from "next/link";
import { respondConnection, requestConnection } from "@/actions/social";
import { Avatar } from "@/components/avatar";
import { Banner } from "@/components/banner";
import { TierBadge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, chipOff, chipOn, field } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isRoleId, ROLES, roleLabel, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string; error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const members = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      id: { not: user.id },
      ...(params.role && isRoleId(params.role) ? { role: params.role } : {}),
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: "insensitive" } },
              { org: { contains: params.q, mode: "insensitive" } },
              { location: { contains: params.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });
  const connections = await prisma.connection.findMany({
    where: { OR: [{ fromId: user.id }, { toId: user.id }] },
    include: { from: true, to: true },
  });
  const incoming = connections.filter((item) => item.toId === user.id && item.status === "PENDING");

  function stateFor(id: string) {
    const row = connections.find((item) => item.fromId === id || item.toId === id);
    if (!row) return "NONE" as const;
    if (row.status === "ACCEPTED") return "ACCEPTED" as const;
    if (row.status === "PENDING" && row.fromId === user.id) return "PENDING" as const;
    if (row.status === "PENDING" && row.toId === user.id) return "INCOMING" as const;
    return "NONE" as const;
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title="Network" />
      <div className="mt-4">
        <Banner error={params.error} notice={params.notice} />
      </div>
      {incoming.length ? (
        <section className="mb-4 rounded border border-brass bg-brass-soft p-4">
          <h2 className="text-sm font-semibold">Connection requests</h2>
          <ul className="mt-2 space-y-2">
            {incoming.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {item.from.name} · {roleShort(roleLabel(item.from.role))}
                </span>
                <span className="flex gap-2">
                  <form action={respondConnection}>
                    <input type="hidden" name="connectionId" value={item.id} />
                    <button className={btnOutline} name="decision" value="DECLINED" type="submit">
                      Decline
                    </button>
                  </form>
                  <form action={respondConnection}>
                    <input type="hidden" name="connectionId" value={item.id} />
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
      <form className="max-w-md" action="/network">
        {params.role ? <input type="hidden" name="role" value={params.role} /> : null}
        <input className={field} name="q" defaultValue={params.q || ""} placeholder="Search members" />
      </form>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <RoleChip href={params.q ? `/network?q=${encodeURIComponent(params.q)}` : "/network"} on={!params.role}>
          All
        </RoleChip>
        {ROLES.map((role) => {
          const search = new URLSearchParams();
          search.set("role", role.id);
          if (params.q) search.set("q", params.q);
          return (
            <RoleChip key={role.id} href={`/network?${search}`} on={params.role === role.id}>
              {roleShort(role.label)}
            </RoleChip>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {members.map((member) => {
          const state = stateFor(member.id);
          return (
            <article key={member.id} className="rounded border border-line bg-paper p-4 text-center transition hover:-translate-y-0.5 hover:shadow-card">
              <Link href={`/members/${member.id}`}>
                <span className="mx-auto grid w-fit">
                  <Avatar initials={member.initials} size="lg" />
                </span>
                <h2 className="mt-2 text-sm font-semibold">{member.name}</h2>
                <p className="text-[11px] text-mut">
                  {roleShort(roleLabel(member.role))} · {member.org}
                </p>
              </Link>
              <div className="mt-2">
                <TierBadge tier={member.tier} />
              </div>
              <div className="mt-3">
                {state === "ACCEPTED" ? (
                  <span className={`${btnOutline} w-full`}>Connected</span>
                ) : state === "PENDING" ? (
                  <span className={`${btn} w-full bg-mut`}>Requested</span>
                ) : state === "INCOMING" ? (
                  <Link href={`/members/${member.id}`} className={`${btn} w-full`}>
                    Respond
                  </Link>
                ) : (
                  <form action={requestConnection}>
                    <input type="hidden" name="toId" value={member.id} />
                    <button className={`${btn} w-full`} type="submit">
                      Connect
                    </button>
                  </form>
                )}
              </div>
            </article>
          );
        })}
      </div>
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
