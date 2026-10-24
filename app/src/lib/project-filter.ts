import { SCOPE_SIZE, SIZE_BANDS, filterDeals, sizeLabel, type FilterableDeal } from "@/lib/domain";
import { ASSET_CLASSES, DEAL_TYPES, US_STATES } from "@/lib/member-network";
import { isRoleId, roleLabel, roleShort } from "@/lib/roles";

export const PROJECT_STAGES = [
  { id: "land", label: "Land / entitlement" },
  { id: "pre-construction", label: "Pre-construction" },
  { id: "construction", label: "Under construction" },
  { id: "stabilized", label: "Stabilized" },
  { id: "recap", label: "Recap" },
] as const;

export const PROJECT_NEEDS = [
  { id: "equity", label: "Equity" },
  { id: "debt", label: "Debt" },
  { id: "gc", label: "GC" },
  { id: "broker", label: "Broker" },
  { id: "advisory", label: "Legal / advisory" },
] as const;

export const POSTED_WINDOWS = [
  { id: "7", label: "Past 7 days", days: 7 },
  { id: "30", label: "Past 30 days", days: 30 },
  { id: "90", label: "Past 90 days", days: 90 },
] as const;

export const PROJECT_SORTS = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "match", label: "Best match" },
] as const;

export const DIRECTORY_SORTS = [
  { id: "name", label: "Name A-Z" },
  { id: "name-za", label: "Name Z-A" },
  { id: "newest", label: "Newest" },
] as const;

export const FILTER_SURFACES = ["deals", "feed", "network"] as const;
export type FilterSurface = (typeof FILTER_SURFACES)[number];

const FILTER_KEYS = ["role", "market", "state", "size", "asset", "assetClass", "stage", "need", "posted", "sort", "q", "tab", "dealType"] as const;

export type ProjectQuery = {
  role?: string;
  market?: string;
  state?: string;
  size?: string;
  asset?: string;
  assetClass?: string;
  stage?: string;
  need?: string;
  posted?: string;
  sort?: string;
  q?: string;
  tab?: string;
  dealType?: string;
};

const ADVISORY_ROLES = new Set([
  "RE_ATTORNEY",
  "SECURITIES_ATTORNEY",
  "ZONING_ATTORNEY",
  "INSURANCE",
  "ARCHITECT_ENGINEER",
  "ACCOUNTANT",
  "APPRAISER",
  "PROPERTY_MANAGER",
  "EXCHANGE_1031",
]);

const INTENT_NEED: Record<string, string> = {
  "raising-equity": "equity",
  "lp-seeking-deals": "equity",
  "seeking-debt": "debt",
  "lender-offering-debt": "debt",
  "seeking-gc": "gc",
  "gc-seeking-projects": "gc",
  "broker-seeking": "broker",
  "advisor-offering": "advisory",
};

export type Narrowable = FilterableDeal & {
  stage?: string | null;
  need?: string | null;
  intent?: string | null;
  createdAt?: Date | null;
  keywords?: string | null;
  match?: number;
};

export function stageLabel(id: string | null | undefined): string {
  return PROJECT_STAGES.find((item) => item.id === id)?.label ?? "";
}

export function needLabel(id: string | null | undefined): string {
  return PROJECT_NEEDS.find((item) => item.id === id)?.label ?? "";
}

export function isStageId(value: string): boolean {
  return PROJECT_STAGES.some((item) => item.id === value);
}

export function isNeedId(value: string): boolean {
  return PROJECT_NEEDS.some((item) => item.id === value);
}

/** Stored need wins. Older rows fall back to the post intent, then the role that was asked for. */
export function inferNeed(input: { need?: string | null; intent?: string | null; roleNeeded?: string | null }): string {
  const stored = (input.need ?? "").trim().toLowerCase();
  if (isNeedId(stored)) return stored;
  const fromIntent = INTENT_NEED[(input.intent ?? "").trim()];
  if (fromIntent) return fromIntent;
  const role = input.roleNeeded ?? "";
  if (role === "GENERAL_CONTRACTOR") return "gc";
  if (role === "BROKER" || role === "MORTGAGE_BROKER") return "broker";
  if (role === "LENDER") return "debt";
  if (role === "INVESTOR_PE" || role === "FAMILY_OFFICE") return "equity";
  if (ADVISORY_ROLES.has(role)) return "advisory";
  return "";
}

export function assetMatches(stored: string, filter: string): boolean {
  const needle = filter.trim().toLowerCase();
  const hay = stored.trim().toLowerCase();
  if (!needle) return true;
  if (!hay) return false;
  if (hay === needle || hay.includes(needle)) return true;
  if (needle === "condo" && /\bcondo(?:minium)?s?\b/.test(hay)) return true;
  if (needle === "mixed-use" && hay.replace(/\s+/g, " ").includes("mixed use")) return true;
  if (needle === "multifamily" && hay.includes("multi-family")) return true;
  return false;
}

export function postedWithin(createdAt: Date | string | null | undefined, windowId: string, now = new Date()): boolean {
  const window = POSTED_WINDOWS.find((item) => item.id === windowId);
  if (!window) return true;
  if (!createdAt) return false;
  const time = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  if (Number.isNaN(time)) return false;
  const age = now.getTime() - time;
  return age >= 0 && age <= window.days * 24 * 60 * 60 * 1000;
}

function active(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "Any" || trimmed === "All" || trimmed === "any") return "";
  return trimmed;
}

export function projectQuery(path: "/deals" | "/feed" | "/network", input: ProjectQuery): string {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = active(input[key]);
    if (!value) continue;
    params.set(key, value);
  }
  const value = params.toString();
  return value ? `${path}?${value}` : path;
}

export function queryString(input: ProjectQuery): string {
  const href = projectQuery("/deals", input);
  const index = href.indexOf("?");
  return index === -1 ? "" : href.slice(index + 1);
}

export function parseProjectQuery(input: Record<string, string | undefined>): ProjectQuery {
  const out: ProjectQuery = {};
  for (const key of FILTER_KEYS) {
    const value = active(input[key]).slice(0, 80);
    if (value) out[key] = value;
  }
  return out;
}

export function readQuery(input: { [key: string]: string | string[] | undefined }): ProjectQuery {
  const raw: Record<string, string | undefined> = {};
  for (const key of FILTER_KEYS) {
    const value = input[key];
    raw[key] = Array.isArray(value) ? value[0] : value;
  }
  return parseProjectQuery(raw);
}

function listed(value: string | undefined, options: readonly string[]): string | undefined {
  if (!value) return undefined;
  return options.find((item) => item.toLowerCase() === value.toLowerCase());
}

export function cleanProjectQuery(input: ProjectQuery, surface: FilterSurface): ProjectQuery {
  const out: ProjectQuery = {};
  if (input.q) out.q = input.q.trim().slice(0, 80);
  if (input.role && isRoleId(input.role)) out.role = input.role;
  const asset = listed(input.asset || input.assetClass, ASSET_CLASSES);
  const state = listed(input.market || input.state, US_STATES);
  if (surface === "network") {
    if (state) out.state = state;
    if (asset) out.assetClass = asset;
    const dealType = listed(input.dealType, DEAL_TYPES);
    if (dealType) out.dealType = dealType;
    const sort = DIRECTORY_SORTS.some((item) => item.id === input.sort) ? input.sort : undefined;
    if (sort && sort !== "name") out.sort = sort;
  } else {
    if (state) out.market = state;
    if (asset) out.asset = asset;
    if (input.size && (SIZE_BANDS.some((item) => item.id === input.size) || input.size === SCOPE_SIZE)) out.size = input.size;
    if (input.stage && isStageId(input.stage)) out.stage = input.stage;
    if (input.posted && POSTED_WINDOWS.some((item) => item.id === input.posted)) out.posted = input.posted;
    const sort = PROJECT_SORTS.some((item) => item.id === input.sort) ? input.sort : undefined;
    if (sort && sort !== "newest") out.sort = sort;
  }
  if (input.need && isNeedId(input.need)) out.need = input.need;
  if (surface === "feed" && input.tab && ["deals", "seeking", "circle"].includes(input.tab)) out.tab = input.tab;
  return out;
}

/** Rejects anything that is not a filter query string. */
export function safeFilterQuery(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length > 500) return null;
  if (trimmed.includes("://") || trimmed.includes("..") || trimmed.includes("\\") || trimmed.includes("#") || trimmed.startsWith("/")) {
    return null;
  }
  const params = new URLSearchParams(trimmed.startsWith("?") ? trimmed.slice(1) : trimmed);
  const next = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const item = params.get(key);
    if (!item) continue;
    if (item.length > 80) return null;
    next.set(key, item);
  }
  return next.toString();
}

export function narrowProjects<T extends Narrowable>(items: T[], filter: ProjectQuery, now = new Date()): T[] {
  const base = filterDeals(items, {
    role: filter.role,
    market: filter.market,
    size: filter.size,
    query: null,
  });
  const query = (filter.q ?? "").trim().toLowerCase();
  const asset = filter.asset || filter.assetClass || "";
  return base.filter((item) => {
    if (asset && !assetMatches(item.assetClass, asset)) return false;
    if (filter.stage && (item.stage ?? "").trim() !== filter.stage) return false;
    if (filter.need && inferNeed(item) !== filter.need) return false;
    if (filter.posted && !postedWithin(item.createdAt, filter.posted, now)) return false;
    if (query) {
      const hay = [
        item.title,
        item.sponsorName,
        item.assetClass,
        item.market,
        item.raiseLabel ?? "",
        stageLabel(item.stage),
        needLabel(inferNeed(item)),
        item.keywords ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

export function sortProjects<T extends { createdAt?: Date | null; match?: number }>(items: T[], sort: string | undefined): T[] {
  const copy = [...items];
  const time = (item: T) => item.createdAt?.getTime() ?? 0;
  if (sort === "oldest") copy.sort((a, b) => time(a) - time(b));
  else if (sort === "match") copy.sort((a, b) => (b.match ?? 0) - (a.match ?? 0) || time(b) - time(a));
  else copy.sort((a, b) => time(b) - time(a));
  return copy;
}

export function directoryNeedMatch(
  member: { role: string; dealTypes: string; lookingFor?: string; offering?: string },
  need: string | undefined,
): boolean {
  if (!need) return true;
  const text = `${member.dealTypes} ${member.lookingFor ?? ""} ${member.offering ?? ""}`.toLowerCase();
  if (need === "equity") return text.includes("equity");
  if (need === "debt") return text.includes("debt");
  if (need === "gc") return member.role === "GENERAL_CONTRACTOR" || text.includes("general contractor");
  if (need === "broker") return member.role === "BROKER" || member.role === "MORTGAGE_BROKER" || /\bbroker\b/.test(text);
  if (need === "advisory") return ADVISORY_ROLES.has(member.role) || text.includes("advisory") || text.includes("legal");
  return true;
}

export function sortDirectory<T extends { name: string; createdAt: Date }>(rows: T[], sort: string | undefined): T[] {
  const copy = [...rows];
  if (sort === "name-za") copy.sort((a, b) => b.name.localeCompare(a.name));
  else if (sort === "newest") copy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  else copy.sort((a, b) => a.name.localeCompare(b.name));
  return copy;
}

export function filterSummary(filters: ProjectQuery): string {
  const parts = [
    filters.asset || filters.assetClass,
    filters.market || filters.state,
    filters.stage ? stageLabel(filters.stage) : "",
    filters.size ? sizeLabel(filters.size) : "",
    filters.need ? needLabel(filters.need) : "",
    filters.role ? roleShort(roleLabel(filters.role)) : "",
    filters.posted ? POSTED_WINDOWS.find((item) => item.id === filters.posted)?.label : "",
    filters.dealType,
    filters.q ? `"${filters.q}"` : "",
  ];
  return parts.filter(Boolean).join(" · ");
}
