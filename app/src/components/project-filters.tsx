import { serverTx } from "@/lib/i18n/server";
import { deleteSavedFilter, saveFilter } from "@/actions/filters";
import { ShareLink } from "@/components/share-link";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { SIZE_BANDS, sizeLabel } from "@/lib/domain";
import { ASSET_CLASSES, DEAL_TYPES, US_STATES } from "@/lib/member-network";
import {
  DIRECTORY_SORTS,
  POSTED_WINDOWS,
  PROJECT_NEEDS,
  PROJECT_SORTS,
  PROJECT_STAGES,
  projectQuery,
  queryString,
  type ProjectQuery,
} from "@/lib/project-filter";
import { ROLES, roleShort } from "@/lib/roles";

export async function ProjectFilterBar({
  path,
  filters,
  saved,
}: {
  path: "/deals" | "/feed" | "/network";
  filters: ProjectQuery;
  saved: { id: string; name: string; query: string }[];
}) {
  const tx = await serverTx();
  const directory = path === "/network";
  const href = projectQuery(path, filters);
  const query = queryString(filters);
  const sorts = directory ? DIRECTORY_SORTS : PROJECT_SORTS;
  const assetName = directory ? "assetClass" : "asset";
  const assetValue = directory ? filters.assetClass || "" : filters.asset || "";
  const stateName = directory ? "state" : "market";
  const stateValue = directory ? filters.state || "" : filters.market || "";

  return (
    <div id="project-filters" className="mt-4 rounded border border-line bg-paper p-3">
      <form key={href} action={path} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {filters.tab ? <input type="hidden" name="tab" value={filters.tab} /> : null}
        <label className="sm:col-span-2 xl:col-span-4">
          <span className={labelCls}>{tx("Keyword")}</span>
          <input className={field} name="q" defaultValue={filters.q || ""} placeholder={tx("Search titles, markets, members")} />
        </label>
        <label>
          <span className={labelCls}>{tx("Asset class")}</span>
          <select className={field} name={assetName} defaultValue={assetValue}>
            <option value="">{tx("Any")}</option>
            {ASSET_CLASSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>{tx("Market / state")}</span>
          <select className={field} name={stateName} defaultValue={stateValue}>
            <option value="">{tx("Nationwide")}</option>
            {US_STATES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {directory ? (
          <label>
            <span className={labelCls}>{tx("Deal type")}</span>
            <select className={field} name="dealType" defaultValue={filters.dealType || ""}>
              <option value="">{tx("Any")}</option>
              {DEAL_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            <span className={labelCls}>{tx("Project stage")}</span>
            <select className={field} name="stage" defaultValue={filters.stage || ""}>
              <option value="">{tx("Any")}</option>
              {PROJECT_STAGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {tx(item.label)}
                </option>
              ))}
            </select>
          </label>
        )}
        {directory ? null : (
          <label>
            <span className={labelCls}>{tx("Capital size")}</span>
            <select className={field} name="size" defaultValue={filters.size || ""}>
              <option value="">{tx("Any")}</option>
              {SIZE_BANDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {tx(item.label)}
                </option>
              ))}
              <option value="scope">{tx(sizeLabel("scope"))}</option>
            </select>
          </label>
        )}
        <label>
          <span className={labelCls}>{tx("What is needed")}</span>
          <select className={field} name="need" defaultValue={filters.need || ""}>
            <option value="">{tx("Any")}</option>
            {PROJECT_NEEDS.map((item) => (
              <option key={item.id} value={item.id}>
                {tx(item.label)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>{tx(directory ? "Role" : "Role of poster")}</span>
          <select className={field} name="role" defaultValue={filters.role || ""}>
            <option value="">{tx("Any")}</option>
            {ROLES.map((item) => (
              <option key={item.id} value={item.id}>
                {tx(roleShort(item.label))}
              </option>
            ))}
          </select>
        </label>
        {directory ? null : (
          <label>
            <span className={labelCls}>{tx("Posted")}</span>
            <select className={field} name="posted" defaultValue={filters.posted || ""}>
              <option value="">{tx("Any time")}</option>
              {POSTED_WINDOWS.map((item) => (
                <option key={item.id} value={item.id}>
                  {tx(item.label)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className={labelCls}>{tx("Sort")}</span>
          <select className={field} name="sort" defaultValue={filters.sort || (directory ? "name" : "newest")}>
            {sorts.map((item) => (
              <option key={item.id} value={item.id}>
                {tx(item.label)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
          <button className={btn} type="submit">
            {tx("Apply filters")}
          </button>
          <a className={btnOutline} href={projectQuery(path, { tab: filters.tab })}>
            {tx("Clear")}
          </a>
          <ShareLink href={href} />
        </div>
      </form>
      <p className="mt-3 break-all text-xs text-mut">{tx("Shareable link:")} {href}</p>
      <details className="mt-3">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold text-forest">{tx("Saved filters")} ({saved.length})</summary>
        {query ? (
          <form action={saveFilter} className="mt-2 flex flex-wrap items-end gap-2">
            <input type="hidden" name="surface" value={path.slice(1)} />
            <input type="hidden" name="query" value={query} />
            <label className="min-w-[12rem] flex-1">
              <span className={labelCls}>{tx("Name")}</span>
              <input className={field} name="name" required maxLength={40} placeholder={tx("NJ multifamily equity")} />
            </label>
            <button className={btnOutline} type="submit">
              {tx("Save filter")}
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-mut">{tx("Apply a filter, then save it for this page.")}</p>
        )}
        {saved.length ? (
          <ul className="mt-3 space-y-2">
            {saved.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <a className="font-semibold text-forest" href={`${path}?${item.query}`}>
                  {item.name}
                </a>
                <form action={deleteSavedFilter}>
                  <input type="hidden" name="surface" value={path.slice(1)} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="query" value={query} />
                  <button className="min-h-11 px-2 text-xs font-semibold text-mut" type="submit">
                    {tx("Remove")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
      </details>
    </div>
  );
}
