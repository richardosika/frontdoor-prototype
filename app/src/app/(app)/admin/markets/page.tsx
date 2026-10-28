import { saveMarketFlags } from "@/actions/taxonomy-admin";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MarketsAdminPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const markets = await prisma.market.findMany({
    where: { kind: { in: ["STATE", "METRO"] } },
    orderBy: [{ focus: "desc" }, { kind: "asc" }, { name: "asc" }],
  });
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageHeader title="Markets" />
      <p className="mt-2 text-sm text-ink">Focus is for outreach only. Signup stays open in every state. County rows stay stored and are not listed here.</p>
      <Banner error={params.error} notice={params.notice} />
      <ul className="mt-4 divide-y divide-line">
        {markets.map((market) => (
          <li key={market.id} className="py-3 text-sm">
            <form action={saveMarketFlags} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={market.id} />
              <span className="min-w-48 font-semibold">
                {market.name} <span className="font-normal text-mut">{market.kind === "STATE" ? market.code : "metro"}</span>
              </span>
              <label className="flex items-center gap-1">
                <input type="checkbox" name="focus" defaultChecked={market.focus} />
                Focus
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" name="active" defaultChecked={market.active} />
                Active
              </label>
              <select name="tier" defaultValue={market.tier} className="min-h-11 rounded-sm border border-line bg-paper px-2 text-sm">
                <option value="SEEDING">Seeding</option>
                <option value="ACTIVE">Active</option>
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
