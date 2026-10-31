import { addProject, resubmitProject } from "@/actions/projects";
import { btn, field, labelCls } from "@/components/ui";
import { serverTx } from "@/lib/i18n/server";
import { MoneyInput } from "@/components/money-input";
import { PROJECT_ASSET_CLASSES, SEEK_CATEGORIES, US_STATES, parseSeeking, reviewLabel } from "@/lib/project-contact";
import { PROJECT_ROLE_LABELS } from "@/lib/project-roles";
import { ProjectUploadRows } from "@/components/project-upload-rows";

export type EditableProject = {
  id: string;
  name: string;
  asset: string;
  street: string;
  city: string;
  state: string;
  year: number;
  valueLabel: string;
  role: string;
  summary: string;
  seeking: string;
  shareWithCircle: boolean;
};

const big = `${field} text-[16px]`;
const label = `${labelCls} text-[12px]`;

/** The project form, used on the profile and on the Ledger. New and edited projects go to staff review. */
export async function ProjectForm({ back, project }: { back: "/profile" | "/feed"; project?: EditableProject }) {
  const tx = await serverTx();
  const seeking = new Set(parseSeeking(project?.seeking ?? ""));
  const id = project ? `p-${project.id}` : `new-${back.slice(1)}`;
  return (
    <form action={project ? resubmitProject : addProject} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2" data-testid="project-form">
      <input type="hidden" name="back" value={back} />
      {project ? <input type="hidden" name="projectId" value={project.id} /> : null}
      <label className="block sm:col-span-2">
        <span className={label}>{tx("Project name")}</span>
        <input name="name" defaultValue={project?.name} className={big} required />
      </label>
      <label className="block">
        <span className={label}>{tx("Asset class")}</span>
        <select name="asset" defaultValue={project?.asset || ""} className={big} required>
          <option value="" disabled>
            {tx("Choose one")}
          </option>
          {PROJECT_ASSET_CLASSES.map((item) => (
            <option key={item} value={item}>
              {tx(item)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={label}>{tx("Your role on the project")}</span>
        <select name="role" defaultValue={project?.role || ""} className={big} required>
          <option value="" disabled>
            {tx("Choose one")}
          </option>
          {PROJECT_ROLE_LABELS.map((item) => (
            <option key={item} value={item}>
              {tx(item)}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className={label}>{tx("Street address")}</span>
        <input name="street" defaultValue={project?.street} className={big} autoComplete="off" placeholder={tx("Optional")} />
      </label>
      <label className="block">
        <span className={label}>{tx("City")}</span>
        <input name="city" defaultValue={project?.city} className={big} required />
      </label>
      <label className="block">
        <span className={label}>{tx("State")}</span>
        <select name="state" defaultValue={project?.state || ""} className={big} required>
          <option value="" disabled>
            {tx("Choose one")}
          </option>
          {US_STATES.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={label}>{tx("Year completed / expected")}</span>
        <input name="year" type="number" inputMode="numeric" min={1980} max={2100} defaultValue={project?.year || ""} className={big} placeholder="2026" required />
      </label>
      <label className="block">
        <span className={label}>{tx("Total project value ($)")}</span>
        <MoneyInput name="valueLabel" defaultValue={project?.valueLabel} className={big} required />
      </label>
      <label className="block sm:col-span-2">
        <span className={label}>{tx("Project notes")}</span>
        <textarea name="summary" rows={2} defaultValue={project?.summary} className={big} placeholder={tx("Optional")} />
      </label>
      <fieldset className="min-w-0 sm:col-span-2">
        <legend className={label}>{tx("Who is this project seeking?")}</legend>
        <p className="mb-2 text-[14px] leading-relaxed text-mut">
          {tx("Only members in the categories you check can contact you about this project. Leave all unchecked if you are not seeking anyone.")}
        </p>
        <div className="grid gap-1 rounded border border-line bg-paper p-3 sm:grid-cols-2">
          {SEEK_CATEGORIES.map((item) => (
            <label key={item.id} htmlFor={`${id}-${item.id}`} className="flex min-h-11 items-center gap-2 text-[15px] text-ink">
              <input id={`${id}-${item.id}`} type="checkbox" name="seeking" value={item.id} defaultChecked={seeking.has(item.id)} className="h-5 w-5 accent-forest" />
              {tx(item.label)}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-11 items-center gap-2 text-[15px] text-ink sm:col-span-2">
        <input type="checkbox" name="shareWithCircle" defaultChecked={project?.shareWithCircle ?? false} className="h-5 w-5 accent-forest" />
        {tx("Share project details with My Circle")}
      </label>
      <p className="text-[14px] leading-relaxed text-mut sm:col-span-2">
        {tx("Private Floor staff review every project. Other members see it only after it is approved.")}
      </p>
      {project ? null : (
        <ProjectUploadRows
          labels={{
            heading: tx("Documents & photos"),
            help: tx("Attach plans, budgets, renderings, or site photos for staff review. PDF, JPG, PNG, or HEIC, up to 5 MB each."),
            label: tx("Label"),
            labelPlaceholder: tx("e.g. Site plan"),
            file: tx("File"),
            add: tx("Add another file"),
            remove: tx("Remove"),
          }}
        />
      )}
      <button className={`${btn} sm:col-span-2`} type="submit">
        {project ? tx("Save and resubmit") : tx("Submit for review")}
      </button>
    </form>
  );
}

export async function ReviewChip({ status }: { status: string }) {
  const tx = await serverTx();
  const tone =
    status === "APPROVED"
      ? "border-forest bg-forest text-paper"
      : status === "NEEDS_INFO"
        ? "border-brass bg-brass text-paper"
        : status === "DECLINED"
          ? "border-line bg-cream text-mut"
          : "border-forest bg-paper text-forest";
  return (
    <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${tone}`} data-testid="review-chip">
      {tx(reviewLabel(status))}
    </span>
  );
}
