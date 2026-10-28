import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/current-user";
import { LISTED_PAYMENT_STATUSES } from "@/lib/payments";
import { assetCoverage, readinessGrid } from "@/lib/platform/admin-taxonomy";
import { THIN_MARKET_MIN } from "@/lib/platform/catalog";
import { prisma } from "@/lib/prisma";
import { ROLES, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ReadinessPage({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const focusOnly = params.focus === "1";
  const [members, markets, assets, setting] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE", paymentStatus: { in: [...LISTED_PAYMENT_STATUSES] }, isAdmin: false },
      select: {
        role: true,
        isTest: true,
        memberMarkets: { where: { relation: { in: ["HOME", "OPERATES"] } }, select: { market: { select: { code: true } } } },
        assetFocus: { select: { assetType: { select: { slug: true } } } },
      },
    }),
    prisma.market.findMany({
      where: { kind: "METRO", active: true },
      orderBy: [{ focus: "desc" }, { name: "asc" }],
      select: { code: true, name: true, focus: true },
    }),
    prisma.assetType.findMany({ where: { active: true, parentId: null }, orderBy: { sortOrder: "asc" }, select: { slug: true, label: true } }),
    prisma.siteSetting.findUnique({ where: { key: "thinMarketMin" } }),
  ]);
  const thinRaw = setting?.value && typeof setting.value === "object" && "n" in setting.value ? Number((setting.value as { n: unknown }).n) : THIN_MARKET_MIN;
  const thinMin = Number.isFinite(thinRaw) && thinRaw > 0 ? thinRaw : THIN_MARKET_MIN;
  const rows = members.map((member) => ({
    role: member.role,
    isTest: member.isTest,
    marketCodes: member.memberMarkets.map((row) => row.market.code),
    assetSlugs: member.assetFocus.map((row) => row.assetType.slug),
  }));
  const grid = readinessGrid({
    members: rows,
    markets,
    roles: ROLES.map((role) => role.id),
    thinMin,
    focusOnly,
  });
  const coverage = assetCoverage({ members: rows, assets });
  const shownMarkets = [...new Set(grid.map((cell) => cell.marketCode))];
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeader title="Readiness" />
      <p className="mt-2 text-sm text-ink">
        Counts come from active members in each metro. TEST accounts are separate. Under {thinMin} non-TEST members, the directory says Growing market.
      </p>
      <p className="mt-2 text-sm">
        <Link className="text-brass" href={focusOnly ? "/admin/readiness" : "/admin/readiness?focus=1"}>
          {focusOnly ? "Show every metro" : "Focus markets only"}
        </Link>
      </p>
      {shownMarkets.length === 0 ? <p className="mt-4 text-sm text-mut">No markets to show. Mark a focus market first, or show every metro.</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="border-b border-line">
              <th className="py-2 pr-3">Metro</th>
              {ROLES.map((role) => (
                <th key={role.id} className="px-2 py-2 font-normal">
                  {roleShort(role.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownMarkets.map((code) => {
              const cells = grid.filter((cell) => cell.marketCode === code);
              return (
                <tr key={code} className="border-b border-line">
                  <th className="py-2 pr-3 text-left font-serif text-sm font-normal">{cells[0]?.marketName}</th>
                  {cells.map((cell) => (
                    <td key={cell.role} className="px-2 py-2">
                      {cell.count}
                      {cell.testCount ? <span className="text-mut"> +{cell.testCount} TEST</span> : null}
                      {cell.growing ? <span className="block text-brass">Growing market</span> : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h2 className="mt-8 font-serif text-2xl">Asset focus</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {coverage.map((row) => (
          <li key={row.slug} className="rounded border border-line bg-paper px-3 py-2 text-sm">
            {row.label}: {row.count}
            {row.testCount ? <span className="text-mut"> +{row.testCount} TEST</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
