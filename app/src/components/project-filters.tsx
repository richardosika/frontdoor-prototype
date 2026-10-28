import { deleteSavedFilter, saveFilter } from "@/actions/filters";
import { ShareLink } from "@/components/share-link";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { SIZE_BANDS, sizeLabel } from "@/lib/domain";
import { ASSET_CLASSES, DEAL_TYPES, US_STATES } from "@/lib/member-network";
import { METROS, SPECIALTIES, directoryAssetOptions } from "@/lib/platform/catalog";
import { GROUPS } from "@/lib/roles";
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

export function ProjectFilterBar({
  path,
  filters,
  saved,
}: {
  path: "/deals" | "/feed" | "/network";
  filters: ProjectQuery;
  saved: { id: string; name: string; query: string; alert?: boolean }[];
}) {
  const directory = path === "/network";
  const href = projectQuery(path, filters);
  const query = queryString(filters);
  const sorts = directory ? DIRECTORY_SORTS : PROJECT_SORTS;
  const assetName = directory ? "assetClass" : "asset";
  const assetValue = directory ? filters.assetClass || "" : filters.asset || "";
  const directoryAssets = directoryAssetOptions();
  const stateName = directory ? "state" : "market";
  const stateValue = directory ? filters.state || "" : filters.market || "";

  return (
    <div id="project-filters" className="mt-4 rounded border border-line bg-paper p-3">
      <form key={href} action={path} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {filters.tab ? <input type="hidden" name="tab" value={filters.tab} /> : null}
        <label className="sm:col-span-2 xl:col-span-4">
          <span className={labelCls}>Keyword</span>
          <input className={field} name="q" defaultValue={filters.q || ""} placeholder="Search titles, markets, members" />
        </label>
        <label>
          <span className={labelCls}>Asset class</span>
          <select className={field} name={assetName} defaultValue={assetValue}>
            <option value="">Any</option>
            {(directory ? directoryAssets : ASSET_CLASSES.map((item) => ({ value: item, label: item }))).map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>Market / state</span>
          <select className={field} name={stateName} defaultValue={stateValue}>
            <option value="">Nationwide</option>
            {US_STATES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {directory ? (
          <label>
            <span className={labelCls}>Metro</span>
            <select className={field} name="metro" defaultValue={filters.metro || ""}>
              <option value="">Any</option>
              {METROS.map((metro) => (
                <option key={metro.code} value={metro.code}>
                  {metro.short}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {directory ? (
          <label>
            <span className={labelCls}>Place</span>
            <select className={field} name="place" defaultValue={filters.place || ""}>
              <option value="">Based in or works in</option>
              <option value="home">Based in</option>
              <option value="operates">Works in</option>
            </select>
          </label>
        ) : null}
        {directory ? (
          <label>
            <span className={labelCls}>Deal size</span>
            <select className={field} name="size" defaultValue={filters.size || ""}>
              <option value="">Any</option>
              {SIZE_BANDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {directory ? (
          <label>
            <span className={labelCls}>Specialty</span>
            <select className={field} name="specialty" defaultValue={filters.specialty || ""}>
              <option value="">Any</option>
              {SPECIALTIES.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {directory ? (
          <label>
            <span className={labelCls}>Role group</span>
            <select className={field} name="group" defaultValue={filters.group || ""}>
              <option value="">Any</option>
              {GROUPS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {directory ? (
          <label>
            <span className={labelCls}>Deal type</span>
            <select className={field} name="dealType" defaultValue={filters.dealType || ""}>
              <option value="">Any</option>
              {DEAL_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            <span className={labelCls}>Project stage</span>
            <select className={field} name="stage" defaultValue={filters.stage || ""}>
              <option value="">Any</option>
              {PROJECT_STAGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {directory ? null : (
          <label>
            <span className={labelCls}>Capital size</span>
            <select className={field} name="size" defaultValue={filters.size || ""}>
              <option value="">Any</option>
              {SIZE_BANDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
              <option value="scope">{sizeLabel("scope")}</option>
            </select>
          </label>
        )}
        <label>
          <span className={labelCls}>What is needed</span>
          <select className={field} name="need" defaultValue={filters.need || ""}>
            <option value="">Any</option>
            {PROJECT_NEEDS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>{directory ? "Role" : "Role of poster"}</span>
          <select className={field} name="role" defaultValue={filters.role || ""}>
            <option value="">Any</option>
            {ROLES.map((item) => (
              <option key={item.id} value={item.id}>
                {roleShort(item.label)}
              </option>
            ))}
          </select>
        </label>
        {directory ? null : (
          <label>
            <span className={labelCls}>Posted</span>
            <select className={field} name="posted" defaultValue={filters.posted || ""}>
              <option value="">Any time</option>
              {POSTED_WINDOWS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className={labelCls}>Sort</span>
          <select className={field} name="sort" defaultValue={filters.sort || (directory ? "name" : "newest")}>
            {sorts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
          <button className={btn} type="submit">
            Apply filters
          </button>
          <a className={btnOutline} href={projectQuery(path, { tab: filters.tab })}>
            Clear
          </a>
          <ShareLink href={href} />
        </div>
      </form>
      <p className="mt-3 break-all text-xs text-mut">Shareable link: {href}</p>
      <details className="mt-3">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold text-forest">Saved filters ({saved.length})</summary>
        {query ? (
          <form action={saveFilter} className="mt-2 flex flex-wrap items-end gap-2">
            <input type="hidden" name="surface" value={path.slice(1)} />
            <input type="hidden" name="query" value={query} />
            <label className="min-w-[12rem] flex-1">
              <span className={labelCls}>Name</span>
              <input className={field} name="name" required maxLength={40} placeholder="NJ multifamily equity" />
            </label>
            {directory ? (
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" name="alert" />
                Email me when a member matches
              </label>
            ) : null}
            <button className={btnOutline} type="submit">
              Save filter
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-mut">Apply a filter, then save it for this page.</p>
        )}
        {saved.length ? (
          <ul className="mt-3 space-y-2">
            {saved.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <a className="font-semibold text-forest" href={`${path}?${item.query}`}>
                  {item.name}
                  {item.alert ? <span className="ml-2 text-[11px] font-normal text-mut">Alert on</span> : null}
                </a>
                <form action={deleteSavedFilter}>
                  <input type="hidden" name="surface" value={path.slice(1)} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="query" value={query} />
                  <button className="min-h-11 px-2 text-xs font-semibold text-mut" type="submit">
                    Remove
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
