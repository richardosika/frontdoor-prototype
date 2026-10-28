import { saveSpecialty, setSpecialtyActive } from "@/actions/taxonomy-admin";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { ROLES, roleShort } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function SpecialtiesPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const [rows, types] = await Promise.all([
    prisma.specialty.findMany({ orderBy: { label: "asc" }, include: { assetType: { select: { label: true } } } }),
    prisma.assetType.findMany({ where: { active: true }, orderBy: { label: "asc" }, select: { id: true, label: true } }),
  ]);
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageHeader title="Specialties" />
      <p className="mt-2 text-sm text-ink">A specialty sits on an existing role. It does not add a new role or a new price.</p>
      <Banner error={params.error} notice={params.notice} />
      <form action={saveSpecialty} className="mt-4 grid gap-2 rounded border border-line bg-cream p-4">
        <label>
          <span className={labelCls}>Label</span>
          <input name="label" className={field} required />
        </label>
        <label>
          <span className={labelCls}>Asset type</span>
          <select name="assetTypeId" className={field} defaultValue="">
            <option value="">None</option>
            {types.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className={labelCls}>Roles</legend>
          <div className="flex flex-wrap gap-2 text-sm">
            {ROLES.map((role) => (
              <label key={role.id} className="flex items-center gap-1">
                <input type="checkbox" name="forRoles" value={role.id} />
                {roleShort(role.label)}
              </label>
            ))}
          </div>
        </fieldset>
        <button className={btn} type="submit">
          Add specialty
        </button>
      </form>
      <ul className="mt-4 divide-y divide-line text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>
              {row.label}
              {row.assetType ? ` · ${row.assetType.label}` : ""}
              {row.active ? "" : " · retired"}
              <span className="block text-xs text-mut">{row.forRoles.join(", ") || "No role"}</span>
            </span>
            <form action={setSpecialtyActive}>
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
