import { MoneyInput } from "@/components/money-input";
import { field, labelCls } from "@/components/ui";
import { serverTx } from "@/lib/i18n/server";
import { DESIGN_STAGES, FACT_FIELDS, PROJECT_STAGES, parseFacts } from "@/lib/project-facts";

const big = `${field} text-[16px]`;
const label = `${labelCls} text-[12px]`;

/** Optional details for the members a project seeks. Each member type sees the ones that matter to them first. */
export async function ProjectFactsFields({ roleFacts }: { roleFacts?: string }) {
  const tx = await serverTx();
  const facts = parseFacts(roleFacts);
  const filled = Object.keys(facts).length > 0;
  return (
    <details className="min-w-0 rounded border border-line bg-paper p-3 sm:col-span-2" open={filled} data-testid="project-facts">
      <summary className="cursor-pointer text-[15px] font-semibold text-forest">{tx("Details for the members you're seeking (optional)")}</summary>
      <p className="mt-1 text-[14px] leading-relaxed text-mut">
        {tx("Lenders see the loan details, contractors see scope, budget and dates, designers see units and design stage. Leave blank anything you do not want to share yet.")}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {FACT_FIELDS.map((item) => {
          const name = `fact_${item.key}`;
          const value = facts[item.key] ?? "";
          return (
            <label key={item.key} className={`block min-w-0 ${item.kind === "text" && item.max > 60 ? "sm:col-span-2" : ""}`}>
              <span className={label}>{tx(item.label)}</span>
              {item.kind === "money" ? (
                <MoneyInput name={name} defaultValue={value} className={big} />
              ) : item.kind === "stage" || item.kind === "design" ? (
                <select name={name} defaultValue={value} className={big}>
                  <option value="">{tx("Not set")}</option>
                  {(item.kind === "stage" ? PROJECT_STAGES : DESIGN_STAGES).map((option) => (
                    <option key={option} value={option}>{tx(option)}</option>
                  ))}
                </select>
              ) : (
                <input
                  name={name}
                  defaultValue={value}
                  className={big}
                  type={item.kind === "number" ? "number" : item.kind === "month" ? "month" : item.kind === "date" ? "date" : "text"}
                  inputMode={item.kind === "number" ? "numeric" : undefined}
                  maxLength={item.max}
                  placeholder={item.hint ? tx(item.hint) : undefined}
                />
              )}
            </label>
          );
        })}
      </div>
    </details>
  );
}
