/**
 * Recommended connections: members who share the viewer's area, fill a category their projects seek, or work on the
 * same project types. Every card shows one specific reason, built only from fields that exist. Staff never appear.
 */
import { subCanReach } from "@/lib/sub-access";
import { memberCategories, parseSeeking, seekLabel } from "@/lib/project-contact";
import { isDeveloperRole } from "@/lib/member-reach";
import { roleLabel, roleShort } from "@/lib/roles";
import { isGeneralContractor, isSubcontractor, parseTrades, tradeLabel } from "@/lib/trades";

export type RecProject = { name: string; asset: string; city: string; state: string; location?: string; reviewStatus: string; seeking: string[]; bidCategories?: string[] };

export type RecMember = {
  id: string;
  role: string;
  location: string;
  markets: string;
  assetClasses: string;
  extraCategories?: string;
  /** Nov 6: a subcontractor's trade ids. */
  trades?: string;
  email?: string;
  isAdmin?: boolean;
  name?: string;
  projects?: RecProject[];
};

export type Reason = { kind: "location" | "category" | "projectType"; text: string; value: string };
/** One-line reason: an English phrase key with {placeholders}, and values. `t` marks values to translate. */
export type ReasonLine = { key: string; vars: Record<string, string>; t: string[] };

/** Private Floor staff domain. */
export const STAFF_EMAIL_DOMAIN = "privatefloorclub.com";

/** Staff and admin accounts: the admin flag, or a Private Floor staff address. Company members are not staff. */
export function isStaffAccount(user: { isAdmin?: boolean | null; email?: string | null; name?: string | null }, staffNames: Set<string> = new Set()): boolean {
  if (user.isAdmin) return true;
  if (user.name && staffNames.has(user.name.trim().toLowerCase())) return true;
  const domain = (user.email || "").trim().toLowerCase().split("@")[1] || "";
  return domain === STAFF_EMAIL_DOMAIN;
}

/** Prisma filter that leaves out staff and admin accounts. */
export const NOT_STAFF_WHERE = { isAdmin: false, NOT: { email: { endsWith: `@${STAFF_EMAIL_DOMAIN}`, mode: "insensitive" } } } as const;

const split = (value: string) =>
  value
    .split(/[,;\n|]/)
    .map((part) => part.trim())
    .filter(Boolean);

/** "Austin, TX" → "TX". */
export function stateOf(location: string): string {
  const last = location.split(",").map((p) => p.trim()).filter(Boolean).pop() ?? "";
  const code = last.toUpperCase().match(/\b[A-Z]{2}\b/)?.[0];
  return code ?? last;
}

/** "Austin, TX" → "Austin". */
export function cityOf(location: string): string {
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2] : "";
}

const low = (v: string) => v.trim().toLowerCase();
const OPEN = (p: RecProject) => p.reviewStatus !== "DECLINED";
const projState = (p: RecProject) => p.state || stateOf(p.location || "");
const projCity = (p: RecProject) => p.city || cityOf(p.location || "");
const projPlace = (p: RecProject) => projCity(p) || projState(p);

/** Where a member works that matches a city/state: their own location or a listed market. */
function placeMatch(member: RecMember, city: string, state: string): string {
  const markets = split(member.markets);
  if (city && low(cityOf(member.location)) === low(city)) return city;
  if (city && markets.some((m) => low(m) === low(city) || low(cityOf(m)) === low(city))) return city;
  if (state && low(stateOf(member.location)) === low(state)) return state;
  if (state && markets.some((m) => low(m) === low(state) || low(stateOf(m)) === low(state))) return state;
  return "";
}

function sharedAsset(a: string[], b: string[]): string {
  const set = new Set(a.map(low));
  return b.find((x) => set.has(low(x))) ?? "";
}

const roleText = (role: string) => roleShort(roleLabel(role));

/** Nov 6: which way a GC / subcontractor pair runs, or null. */
export function gcSubPair(viewer: RecMember, other: RecMember): "sub-sees-gc" | "gc-sees-sub" | null {
  if (isSubcontractor(viewer) && isGeneralContractor(other) && !isSubcontractor(other)) return "sub-sees-gc";
  if (isGeneralContractor(viewer) && isSubcontractor(other) && !isGeneralContractor(other)) return "gc-sees-sub";
  return null;
}

/** The single most specific reason, or null. Never invents data: every value comes from a field. */
export function reasonLine(viewer: RecMember & { seeking: string[] }, other: RecMember): ReasonLine | null {
  const vProjects = (viewer.projects ?? []).filter(OPEN);
  const oProjects = (other.projects ?? []).filter((p) => p.reviewStatus === "APPROVED");
  const theirCats = memberCategories(other);
  const myCats = memberCategories(viewer);

  // 1. They fill a category one of my projects (or open bid requests) seeks.
  for (const p of vProjects) {
    const cat = theirCats.find((c) => p.seeking.includes(c) || (p.bidCategories ?? []).includes(c));
    if (!cat) continue;
    const place = placeMatch(other, projCity(p), projState(p));
    const project = projPlace(p) || p.name;
    if (place) return { key: "{role} active in {place}, matches your {project} project", vars: { role: roleText(other.role), place, project }, t: ["role"] };
    return { key: "{role} for your {project} project, which seeks {category}", vars: { role: roleText(other.role), project, category: seekLabel(cat) }, t: ["role", "category"] };
  }
  // 2. Their open project or bid request seeks my category.
  for (const p of oProjects) {
    const bidCat = myCats.find((c) => (p.bidCategories ?? []).includes(c));
    const place = projPlace(p);
    if (bidCat && place) return { key: "Open bid request in {place} for {category}", vars: { place, category: seekLabel(bidCat) }, t: ["category"] };
    const cat = myCats.find((c) => p.seeking.includes(c));
    if (cat && place) return { key: "Open {project} project in {place} seeks {category}", vars: { project: p.asset || p.name, place, category: seekLabel(cat) }, t: ["project", "category"] };
  }
  // Nov 6: subcontractors and general contractors are matched with each other first, by area.
  const pair = gcSubPair(viewer, other);
  if (pair) {
    const place = placeMatch(other, cityOf(viewer.location), stateOf(viewer.location)) || sharedAsset(split(viewer.markets), split(other.markets));
    if (pair === "sub-sees-gc") {
      if (place) return { key: "General contractor active in {place}, where you work", vars: { place }, t: [] };
      return { key: "General contractor who hires trade subcontractors", vars: {}, t: [] };
    }
    const trade = parseTrades(other.trades ?? "")[0];
    if (trade && place) return { key: "{trade} subcontractor active in {place}", vars: { trade: tradeLabel(trade), place }, t: ["trade"] };
    if (trade) return { key: "{trade} subcontractor", vars: { trade: tradeLabel(trade) }, t: ["trade"] };
    if (place) return { key: "Subcontractor active in {place}", vars: { place }, t: [] };
  }
  // 3. A developer who builds the asset type of my project, in its area.
  if (isDeveloperRole(other.role)) {
    for (const p of vProjects) {
      const asset = sharedAsset([p.asset, ...split(viewer.assetClasses)].filter(Boolean), [...split(other.assetClasses), ...oProjects.map((o) => o.asset)]);
      const place = placeMatch(other, projCity(p), projState(p)) || oProjects.find((o) => low(projState(o)) === low(projState(p)) && projState(p))?.state || "";
      if (asset && place) {
        const inReview = p.reviewStatus === "PENDING_REVIEW" || p.reviewStatus === "NEEDS_INFO";
        return { key: inReview ? "Builds {asset} in {place}, where you have a project in review" : "Builds {asset} in {place}, where you have a project", vars: { asset, place }, t: ["asset"] };
      }
    }
  }
  // 4. Same asset type and same area.
  const vState = stateOf(viewer.location);
  const vCity = cityOf(viewer.location);
  const asset = sharedAsset(split(viewer.assetClasses), split(other.assetClasses));
  const place = placeMatch(other, vCity, vState) || sharedAsset(split(viewer.markets), split(other.markets));
  if (asset && place) return { key: "Works on {asset} in {place}, like you", vars: { asset, place }, t: ["asset"] };
  // 5. Area only.
  if (vCity && low(cityOf(other.location)) === low(vCity)) return { key: "Also based in {place}", vars: { place: vCity }, t: [] };
  if (place) return { key: "Also active in {place}", vars: { place }, t: [] };
  if (asset) return { key: "Also works on {asset}", vars: { asset }, t: ["asset"] };
  return null;
}

/** Fill a reason line in the viewer's language. */
export function formatReason(line: ReasonLine, tx: (s: string) => string): string {
  return tx(line.key).replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = line.vars[k] ?? "";
    return line.t.includes(k) ? tx(v) : v;
  });
}

export function recommendReasons(viewer: RecMember & { seeking: string[] }, other: RecMember): Reason[] {
  const reasons: Reason[] = [];
  const vState = stateOf(viewer.location);
  const oState = stateOf(other.location);
  const vMarkets = new Set(split(viewer.markets).map((m) => m.toLowerCase()));
  const sharedMarket = split(other.markets).find((m) => vMarkets.has(m.toLowerCase()));
  if (vState && vState === oState) reasons.push({ kind: "location", text: "Same area", value: other.location });
  else if (sharedMarket) reasons.push({ kind: "location", text: "Same market", value: sharedMarket });
  const theirCategories = memberCategories(other);
  const sought = theirCategories.find((c) => viewer.seeking.includes(c));
  if (sought) reasons.push({ kind: "category", text: "Your projects seek", value: seekLabel(sought) });
  else if (!isDeveloperRole(viewer.role) && isDeveloperRole(other.role)) reasons.push({ kind: "category", text: "Developer", value: "" });
  if (!sought && gcSubPair(viewer, other)) reasons.push({ kind: "category", text: "General contractor and subcontractor", value: "" });
  const vTypes = new Set(split(viewer.assetClasses).map((a) => a.toLowerCase()));
  const sharedType = split(other.assetClasses).find((a) => vTypes.has(a.toLowerCase()));
  if (sharedType) reasons.push({ kind: "projectType", text: "Same project type", value: sharedType });
  return reasons;
}

const WEIGHT: Record<Reason["kind"], number> = { category: 3, location: 2, projectType: 1 };

/** Top matches, best first. Staff are never recommended: admins, staff addresses, and other accounts under a staff member's name. Each pick carries one specific reason line. */
export function recommend(viewer: RecMember & { seeking: string[] }, others: RecMember[], exclude: Set<string>, limit = 6, staffNames: Set<string> = new Set()) {
  return others
    // Nov 10 (Julia): a subcontractor is recommended only general contractors and architects.
    .filter((other) => other.id !== viewer.id && !exclude.has(other.id) && !isStaffAccount(other, staffNames) && subCanReach(viewer, other))
    .map((other) => {
      const reasons = recommendReasons(viewer, other);
      const line = reasonLine(viewer, other);
      // Nov 6: a GC for a sub (or a sub for a GC) ranks ahead of developers and others with the same reasons.
      return { id: other.id, reasons, line, score: reasons.reduce((sum, r) => sum + WEIGHT[r.kind], 0) + (line ? 1 : 0) + (gcSubPair(viewer, other) ? 1 : 0) };
    })
    .filter((row) => row.score >= 3 && row.line)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export { parseSeeking };
