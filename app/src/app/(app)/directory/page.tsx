import Link from "next/link";
import { requestConnection } from "@/actions/social";
import { Banner } from "@/components/banner";
import { SubmitButton } from "@/components/submit-button";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { btn, card, field, labelCls } from "@/components/ui";
import { sortByShownLabel } from "@/lib/category-sort";
import { requireUser } from "@/lib/current-user";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { DIRECTORY_PAGE_SIZE, filterDirectory } from "@/lib/member-directory";
import { prisma } from "@/lib/prisma";
import { staffNameSet } from "@/lib/project-contact-db";
import { NOT_STAFF_WHERE } from "@/lib/recommendations";
import { ROLES, roleById } from "@/lib/roles";
import { subCanReach, subCanSee } from "@/lib/sub-access";

export const dynamic = "force-dynamic";

/** Nov 10 (Julia): Member Directory, where members search for people who belong to the club. */
export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; location?: string; error?: string; notice?: string }> }) {
  const user = await requireUser();
  const tx = await serverTx();
  const locale = await currentLocale();
  const query = await searchParams;
  const [rows, staffNames, blocks] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE", ...NOT_STAFF_WHERE },
      select: { id: true, name: true, initials: true, org: true, role: true, location: true, photoId: true, extraCategories: true, email: true, isAdmin: true, status: true, paymentStatus: true },
      take: 2000,
    }),
    staffNameSet(),
    prisma.block.findMany({ where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] }, select: { blockerId: true, blockedId: true } }),
  ]);
  const blocked = new Set(blocks.map((b) => (b.blockerId === user.id ? b.blockedId : b.blockerId)));
  const viewer = { id: user.id, role: user.role, extraCategories: user.extraCategories };
  const found = filterDirectory(rows, viewer, query, { staffNames, blocked, shown: tx });
  const shown = found.slice(0, DIRECTORY_PAGE_SIZE);
  const visibleIds = shown.map((row) => row.id);
  const connections = await prisma.connection.findMany({
    where: { OR: [{ fromId: user.id, toId: { in: visibleIds } }, { toId: user.id, fromId: { in: visibleIds } }] },
    select: { fromId: true, toId: true, status: true },
  });
  const connectionByMember = new Map(connections.map((c) => [c.fromId === user.id ? c.toId : c.fromId, c]));
  const backQuery = new URLSearchParams();
  for (const key of ["q", "category", "location"] as const) if (query[key]) backQuery.set(key, query[key]);
  const back = `/directory${backQuery.size ? `?${backQuery}` : ""}`;
  const categories = sortByShownLabel(
    ROLES.filter((role) => subCanSee(viewer, { role: role.id })),
    (role) => tx(role.category),
    locale,
    (role) => role.id,
  );
  return (
    <div className="mx-auto max-w-[980px] px-4 pb-24 pt-3 md:pb-8 md:pt-6 lg:px-8" data-testid="member-directory">
      <PageHeader title={tx("Member Directory")} />
      <Banner error={query.error ? tx(query.error) : undefined} notice={query.notice ? tx(query.notice) : undefined} />
      <p className="mt-1 text-[16px] leading-relaxed text-ink">{tx("Search for people who belong to the club by name, company, category or location.")}</p>
      <form method="get" className={`${card} mt-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-[2fr_1.4fr_1.2fr_auto] sm:items-end`} data-testid="directory-search">
        <label className="block min-w-0">
          <span className={labelCls}>{tx("Name or company")}</span>
          <input name="q" defaultValue={query.q ?? ""} className={field} placeholder={tx("Search members")} data-testid="directory-q" />
        </label>
        <label className="block min-w-0">
          <span className={labelCls}>{tx("Category")}</span>
          <select name="category" defaultValue={query.category ?? ""} className={field} data-testid="directory-category">
            <option value="">{tx("All categories")}</option>
            {categories.map((role) => (
              <option key={role.id} value={role.id}>{tx(role.category)}</option>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <span className={labelCls}>{tx("Location")}</span>
          <input name="location" defaultValue={query.location ?? ""} className={field} placeholder={tx("City or state")} data-testid="directory-location" />
        </label>
        <button type="submit" className={`${btn} min-h-11`}>{tx("Search")}</button>
      </form>
      <p className="mt-3 text-[14px] text-mut" data-testid="directory-count">
        {found.length === 1 ? tx("1 member") : tx("{n} members").replace("{n}", String(found.length))}
      </p>
      {shown.length ? (
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="directory-list">
          {shown.map((row) => {
            const connection = connectionByMember.get(row.id);
            const status = connection?.status === "ACCEPTED" ? "ACCEPTED" : connection?.status === "PENDING" ? (connection.fromId === user.id ? "PENDING" : "INCOMING") : "NONE";
            return (
              <li key={row.id} className={`${card} min-w-0 p-3`} data-testid="directory-row">
                <Link href={`/members/${row.id}`} className="flex min-h-[72px] items-center gap-3 hover:text-forest">
                  <Avatar initials={row.initials} photoId={row.photoId ?? ""} />
                  <span className="min-w-0">
                    <b className="block truncate text-[16px] text-forest">{row.name}</b>
                    <span className="block truncate text-[14px] text-ink">{[row.org, tx(roleById(row.role)?.category ?? "Member")].filter(Boolean).join(" · ")}</span>
                    {row.location ? <span className="block truncate text-[13px] text-mut">{row.location}</span> : null}
                  </span>
                </Link>
                {subCanReach(viewer, row) ? (
                  <div className="mt-2 flex min-w-0 flex-wrap items-center">
                    {status === "NONE" ? (
                      <form action={requestConnection} className="w-full min-w-0">
                        <input type="hidden" name="toId" value={row.id} />
                        <input type="hidden" name="back" value={back} />
                        <SubmitButton className={`${btn} min-h-11 w-full whitespace-normal`} data-testid="directory-add-circle" pendingLabel="Sending request…">{tx("Add to My Circle")}</SubmitButton>
                      </form>
                    ) : status === "PENDING" ? (
                      <span className="flex min-h-11 items-center text-[14px] text-mut" data-testid="directory-pending">{tx("Request pending")}</span>
                    ) : status === "INCOMING" ? (
                      <Link href="/network" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-forest underline decoration-brass">{tx("Respond")}</Link>
                    ) : (
                      <span className="flex min-h-11 items-center text-[14px] text-forest" data-testid="directory-in-circle">{tx("In My Circle")}</span>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={`${card} mt-2 p-4 text-[15px] text-ink`} data-testid="directory-empty">{tx("No members match this search.")}</p>
      )}
      {found.length > shown.length ? <p className="mt-3 text-[14px] text-mut">{tx("Showing the first {n}. Narrow the search to see more.").replace("{n}", String(shown.length))}</p> : null}
    </div>
  );
}
