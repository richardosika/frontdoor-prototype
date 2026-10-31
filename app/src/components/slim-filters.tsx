import Link from "next/link";
import { btn, field } from "@/components/ui";
import { serverTx } from "@/lib/i18n/server";
import { DEAL_SIZE_BANDS, type SlimFilters } from "@/lib/member-reach";
import { PROJECT_ASSET_CLASSES, US_STATES } from "@/lib/project-contact";

/** The slim filter bar (#21, #27): asset class, state and deal size only. A plain GET form; works on a 390px phone. */
export async function SlimFilterBar({ path, filters, anchor }: { path: string; filters: SlimFilters; anchor?: string }) {
  const tx = await serverTx();
  const active = Boolean(filters.asset || filters.state || filters.size);
  return (
    <form action={`${path}${anchor ? `#${anchor}` : ""}`} className="mb-3 grid grid-cols-2 gap-2 rounded border border-line bg-cream p-2 sm:grid-cols-[1fr_1fr_1fr_auto]" data-testid="slim-filters">
      <label className="min-w-0">
        <span className="sr-only">{tx("Asset class")}</span>
        <select name="asset" defaultValue={filters.asset} className={`${field} w-full text-[15px]`} aria-label={tx("Asset class")}>
          <option value="">{tx("Asset class")}: {tx("Any")}</option>
          {PROJECT_ASSET_CLASSES.map((item) => (
            <option key={item} value={item}>
              {tx(item)}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0">
        <span className="sr-only">{tx("State")}</span>
        <select name="state" defaultValue={filters.state} className={`${field} w-full text-[15px]`} aria-label={tx("State")}>
          <option value="">{tx("State")}: {tx("Any")}</option>
          {US_STATES.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="col-span-2 min-w-0 sm:col-span-1">
        <span className="sr-only">{tx("Deal size")}</span>
        <select name="size" defaultValue={filters.size} className={`${field} w-full text-[15px]`} aria-label={tx("Deal size")}>
          <option value="">{tx("Deal size")}: {tx("Any")}</option>
          {DEAL_SIZE_BANDS.map((band) => (
            <option key={band.id} value={band.id}>
              {tx(band.label)}
            </option>
          ))}
        </select>
      </label>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
        <button className={`${btn} flex-1 sm:flex-none`} type="submit">
          {tx("Apply")}
        </button>
        {active ? (
          <Link href={`${path}${anchor ? `#${anchor}` : ""}`} className="text-[14px] font-semibold text-forest underline decoration-brass">
            {tx("Clear")}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
