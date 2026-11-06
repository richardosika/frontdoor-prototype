/**
 * Nov 6: Subcontractors. The trades a sub can pick, how their service area is read, and which trade bid packages
 * reach which subs. Pure rules only; DB code lives in trades-db.ts.
 */
import { sortByShownLabel } from "@/lib/category-sort";
import { memberCategories } from "@/lib/project-contact";
import { US_STATES } from "@/lib/member-network";

export const TRADES = [
  { id: "ELECTRICAL", label: "Electrical" },
  { id: "PLUMBING", label: "Plumbing" },
  { id: "HVAC", label: "HVAC" },
  { id: "FIRE_PROTECTION", label: "Fire Protection" },
  { id: "CONCRETE", label: "Concrete" },
  { id: "MASONRY", label: "Masonry" },
  { id: "STEEL", label: "Steel" },
  { id: "FRAMING_CARPENTRY", label: "Framing & Carpentry" },
  { id: "DRYWALL", label: "Drywall" },
  { id: "ROOFING", label: "Roofing" },
  { id: "GLAZING_WINDOWS", label: "Glazing & Windows" },
  { id: "FLOORING", label: "Flooring" },
  { id: "PAINTING", label: "Painting" },
  { id: "SITEWORK_EXCAVATION", label: "Sitework & Excavation" },
  { id: "ELEVATOR", label: "Elevator" },
  { id: "MILLWORK", label: "Millwork" },
  { id: "OTHER", label: "Other Trades" },
] as const;

export type TradeId = (typeof TRADES)[number]["id"];
const BY_ID = new Map<string, string>(TRADES.map((t) => [t.id, t.label]));
const BY_LABEL = new Map<string, string>(TRADES.map((t) => [t.label.toLowerCase(), t.id]));

export function isTrade(id: string): id is TradeId {
  return BY_ID.has(id);
}

export function tradeLabel(id: string): string {
  return BY_ID.get(id) ?? id;
}

/** Trade ids from a comma list. Also reads trade labels (the join form stores labels). Unknown values are dropped. */
export function parseTrades(raw: string | string[] | null | undefined): TradeId[] {
  const parts = (Array.isArray(raw) ? raw : String(raw ?? "").split(",")).map((p) => String(p).trim()).filter(Boolean);
  const out: TradeId[] = [];
  for (const p of parts) {
    const id = isTrade(p) ? p : BY_LABEL.get(p.toLowerCase());
    if (id && isTrade(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

export function serializeTrades(ids: string[]): string {
  return parseTrades(ids).join(",");
}

/** Trades A–Z in the shown language, Other Trades last. */
export function sortedTrades(locale: string, tx: (s: string) => string) {
  return sortByShownLabel(TRADES, (t) => tx(t.label), locale, (t) => t.id);
}

/** Two-letter states from a member's markets list ("NJ, NY") or a project location ("Newark, NJ"). */
export function statesFrom(raw: string | null | undefined): string[] {
  const states = new Set<string>();
  for (const m of String(raw ?? "").toUpperCase().matchAll(/\b([A-Z]{2})\b/g)) {
    if ((US_STATES as readonly string[]).includes(m[1])) states.add(m[1]);
  }
  return [...states];
}

/** A member is a subcontractor by role or by an approved extra category. */
export function isSubcontractor(member: { role: string | null | undefined; extraCategories?: string | null }): boolean {
  return memberCategories(member).includes("SUBCONTRACTOR");
}

/** A general contractor by role or approved extra category. */
export function isGeneralContractor(member: { role: string | null | undefined; extraCategories?: string | null }): boolean {
  return memberCategories(member).includes("GENERAL_CONTRACTOR");
}

export type SubForMatch = { id?: string; role: string; extraCategories?: string | null; trades: string; markets: string; location: string };
export type PackageForMatch = { trade: string; serviceStates: string };

/** States a sub serves: the states they picked, else the state they are based in. */
export function subStates(sub: Pick<SubForMatch, "markets" | "location">): string[] {
  const picked = statesFrom(sub.markets);
  return picked.length ? picked : statesFrom(sub.location).slice(-1);
}

/** Rule: a trade bid package reaches a sub only when the sub lists that trade and serves one of the package's states. */
export function subMatchesPackage(sub: SubForMatch, pkg: PackageForMatch): boolean {
  if (!pkg.trade || !isSubcontractor(sub)) return false;
  if (!parseTrades(sub.trades).includes(pkg.trade as TradeId)) return false;
  const need = statesFrom(pkg.serviceStates);
  if (!need.length) return false;
  const served = subStates(sub);
  return need.some((s) => served.includes(s));
}

/** Yes / No / not answered, for union shop and prevailing wage. */
export function yesNo(raw: unknown): "yes" | "no" | "" {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "yes" || v === "no" ? v : "";
}

/** Certificate of insurance: PDF, JPG or PNG up to 10 MB, checked by the file's own bytes. */
export const COI_MAX_BYTES = 10 * 1024 * 1024;
export function coiType(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  return null;
}

/** Nov 6: on approval, a subcontractor's join form answers become profile fields (trades, states, license). */
export function subProfileFromJoin(joinProfile: unknown): { trades: string; markets: string; licenseState: string; licenseNumber: string; licenses: string; specialties: string } | Record<string, never> {
  if (!joinProfile || typeof joinProfile !== "object") return {};
  const jp = joinProfile as { specialties?: unknown; states?: unknown };
  const trades = parseTrades(Array.isArray(jp.specialties) ? jp.specialties.map(String) : []);
  const rows = (Array.isArray(jp.states) ? jp.states : []) as { state?: string; licensed?: boolean; looking?: boolean; licenseNumber?: string }[];
  const states = [...new Set(rows.map((r) => String(r?.state ?? "").toUpperCase()).filter((s) => (US_STATES as readonly string[]).includes(s)))];
  const licensed = rows.find((r) => r?.licensed && String(r.licenseNumber ?? "").trim()) ?? rows.find((r) => String(r?.licenseNumber ?? "").trim());
  const licenseState = licensed ? String(licensed.state ?? "").toUpperCase() : "";
  const licenseNumber = licensed ? String(licensed.licenseNumber ?? "").trim().slice(0, 80) : "";
  return {
    trades: trades.join(","),
    markets: states.join(", "),
    licenseState,
    licenseNumber,
    licenses: [licenseState, licenseNumber].filter(Boolean).join(" "),
    specialties: trades.map(tradeLabel).join(", "),
  };
}
