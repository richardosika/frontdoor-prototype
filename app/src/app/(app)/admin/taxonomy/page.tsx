import { moveAssetType, saveAssetField, saveAssetType, setAssetActive, setFieldActive } from "@/actions/taxonomy-admin";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { FIELD_CAP } from "@/lib/platform/admin-taxonomy";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TaxonomyPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const [types, fields] = await Promise.all([
    prisma.assetType.findMany({ orderBy: { sortOrder: "asc" }, include: { parent: { select: { label: true } } } }),
    prisma.assetField.findMany({ orderBy: { sortOrder: "asc" }, include: { assetType: { select: { label: true } } } }),
  ]);
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageHeader title="Asset types and fields" />
      <p className="mt-2 text-sm text-ink">Retiring a type hides it from new profiles and keeps existing rows. A type can have {FIELD_CAP} active fields.</p>
      <Banner error={params.error} notice={params.notice} />
      <form action={saveAssetType} className="mt-4 grid gap-2 rounded border border-line bg-cream p-4 sm:grid-cols-2">
        <label>
          <span className={labelCls}>Label</span>
          <input name="label" className={field} required />
        </label>
        <label>
          <span className={labelCls}>Group</span>
          <select name="parentId" className={field} defaultValue="">
            <option value="">Top level</option>
            {types.filter((row) => !row.parentId).map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        <button className={`${btn} sm:col-span-2`} type="submit">
          Add asset type
        </button>
      </form>
      <ul className="mt-4 divide-y divide-line">
        {types.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span>
              {row.parent ? `${row.parent.label}: ` : ""}
              {row.label}
              {row.active ? "" : " · retired"}
            </span>
            <span className="flex gap-2">
              <form action={moveAssetType}>
                <input type="hidden" name="id" value={row.id} />
                <button className={btnOutline} name="direction" value="up" type="submit">
                  Up
                </button>
              </form>
              <form action={moveAssetType}>
                <input type="hidden" name="id" value={row.id} />
                <button className={btnOutline} name="direction" value="down" type="submit">
                  Down
                </button>
              </form>
              <form action={setAssetActive}>
                <input type="hidden" name="id" value={row.id} />
                <button className={btnOutline} name="active" value={row.active ? "0" : "1"} type="submit">
                  {row.active ? "Retire" : "Restore"}
                </button>
              </form>
            </span>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 font-serif text-2xl">Fields</h2>
      <form action={saveAssetField} className="mt-3 grid gap-2 rounded border border-line bg-paper p-4 sm:grid-cols-2">
        <label>
          <span className={labelCls}>Label</span>
          <input name="label" className={field} required />
        </label>
        <label>
          <span className={labelCls}>Asset type</span>
          <select name="assetTypeId" className={field} defaultValue="">
            <option value="">Every asset type</option>
            {types.filter((row) => row.active).map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>Kind</span>
          <select name="kind" className={field} defaultValue="TEXT">
            <option value="TEXT">Text</option>
            <option value="NUMBER">Number</option>
            <option value="BOOLEAN">Yes or no</option>
            <option value="SELECT">One choice</option>
            <option value="MULTISELECT">Several choices</option>
          </select>
        </label>
        <label>
          <span className={labelCls}>Where it appears</span>
          <select name="scope" className={field} defaultValue="PROFILE">
            <option value="PROFILE">Profile</option>
            <option value="DEAL">Deal</option>
            <option value="PROJECT">Project</option>
            <option value="VENDOR">Vendor</option>
          </select>
        </label>
        <label>
          <span className={labelCls}>Unit</span>
          <input name="unit" className={field} placeholder="keys, beds, NRSF" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="filterable" />
          Filterable later
        </label>
        <button className={`${btn} sm:col-span-2`} type="submit">
          Add field
        </button>
      </form>
      <ul className="mt-4 divide-y divide-line text-sm">
        {fields.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>
              {row.label} · {row.assetType?.label || "Every type"} · {row.kind}
              {row.active ? "" : " · retired"}
            </span>
            <form action={setFieldActive}>
              <input type="hidden" name="id" value={row.id} />
              <button className={btnOutline} name="active" value={row.active ? "0" : "1"} type="submit">
                {row.active ? "Retire" : "Restore"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
