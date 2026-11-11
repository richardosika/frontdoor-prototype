// #46: structured insurance lines with limits, stored as JSON so developers can filter later.
export const INSURANCE_TYPES = [
  { id: "GL", label: "General liability", agg: true, limitLabel: "Per occurrence", aggLabel: "Aggregate" },
  { id: "UMBRELLA", label: "Umbrella / excess" },
  { id: "BUILDERS_RISK", label: "Builder's risk" },
  { id: "WORKERS_COMP", label: "Workers' comp" },
  { id: "AUTO", label: "Commercial auto" },
  { id: "PROFESSIONAL", label: "Professional liability (E&O)" },
  { id: "POLLUTION", label: "Pollution liability" },
  { id: "SURETY", label: "Surety bonding capacity", agg: true, limitLabel: "Single job", aggLabel: "Aggregate" },
  { id: "OTHER", label: "Other", named: true },
] as const;
export type InsuranceTypeId = (typeof INSURANCE_TYPES)[number]["id"];
export type Coverage = { type: InsuranceTypeId; limit: number | null; aggregate?: number | null; name?: string };

const IDS = new Set<string>(INSURANCE_TYPES.map((t) => t.id));
const MAX = 1e13;

export function parseMoney(raw: unknown): number | null {
  const s = String(raw ?? "").trim().toLowerCase().replace(/[$,\s]/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)([kmb])?$/);
  if (!m) return null;
  const n = Math.round(Number(m[1]) * (m[2] === "k" ? 1e3 : m[2] === "m" ? 1e6 : m[2] === "b" ? 1e9 : 1));
  return n > 0 && n < MAX ? n : null;
}

export function normalizeCoverage(value: unknown): Coverage[] {
  if (!Array.isArray(value)) return [];
  const out: Coverage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    if (!IDS.has(String(c.type)) || out.some((o) => o.type === c.type)) continue;
    const row: Coverage = { type: c.type as InsuranceTypeId, limit: parseMoney(c.limit) };
    const t = INSURANCE_TYPES.find((x) => x.id === c.type)!;
    if ("agg" in t) row.aggregate = parseMoney(c.aggregate);
    if ("named" in t) row.name = String(c.name ?? "").trim().slice(0, 60);
    out.push(row);
  }
  return out;
}

export function coverageFromForm(form: { getAll(k: string): unknown[]; get(k: string): unknown }): Coverage[] {
  const picked = new Set(form.getAll("insCov").map(String));
  return normalizeCoverage(
    INSURANCE_TYPES.filter((t) => picked.has(t.id)).map((t) => ({ type: t.id, limit: form.get(`insLim_${t.id}`), aggregate: form.get(`insAgg_${t.id}`), name: form.get(`insName_${t.id}`) })),
  );
}

/** $2M, $1.5M, $750K, $2B */
export function shortMoney(n: number): string {
  const f = (v: number, u: string) => `$${Number(v.toFixed(v < 10 ? 2 : 1)).toString()}${u}`;
  if (n >= 1e9) return f(n / 1e9, "B");
  if (n >= 1e6) return f(n / 1e6, "M");
  if (n >= 1e3) return f(n / 1e3, "K");
  return `$${n}`;
}

/** "General liability $2M / $4M · Umbrella / excess $10M". Labels go through tx for the viewer's language. */
export function coverageSummary(list: Coverage[], tx: (s: string) => string = (s) => s): string {
  return list
    .map((c) => {
      const t = INSURANCE_TYPES.find((x) => x.id === c.type)!;
      const label = c.type === "OTHER" && c.name ? c.name : tx(t.label);
      const money = [c.limit, c.aggregate].filter((v): v is number => typeof v === "number").map(shortMoney).join(" / ");
      return money ? `${label} ${money}` : label;
    })
    .join(" · ");
}
