import Link from "next/link";
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
import { subCanSee } from "@/lib/sub-access";

export const dynamic = "force-dynamic";

/** Nov 10 (Julia): Member Directory, where members search for people who belong to the club. */
export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; location?: string }> }) {
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
  const categories = sortByShownLabel(
    ROLES.filter((role) => subCanSee(viewer, { role: role.id })),
    (role) => tx(role.category),
    locale,
    (role) => role.id,
  );
  return (
    <div className="mx-auto max-w-[980px] px-4 pb-24 pt-3 md:pb-8 md:pt-6 lg:px-8" data-testid="member-directory">
      <PageHeader title={tx("Member Directory")} />
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
          {shown.map((row) => (
            <li key={row.id}>
              <Link href={`/members/${row.id}`} className={`${card} flex min-h-[72px] items-center gap-3 p-3 hover:border-brass`} data-testid="directory-row">
                <Avatar initials={row.initials} photoId={row.photoId ?? ""} />
                <span className="min-w-0">
                  <b className="block truncate text-[16px] text-forest">{row.name}</b>
                  <span className="block truncate text-[14px] text-ink">{[row.org, tx(roleById(row.role)?.category ?? "Member")].filter(Boolean).join(" · ")}</span>
                  {row.location ? <span className="block truncate text-[13px] text-mut">{row.location}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`${card} mt-2 p-4 text-[15px] text-ink`} data-testid="directory-empty">{tx("No members match this search.")}</p>
      )}
      {found.length > shown.length ? <p className="mt-3 text-[14px] text-mut">{tx("Showing the first {n}. Narrow the search to see more.").replace("{n}", String(shown.length))}</p> : null}
    </div>
  );
}
