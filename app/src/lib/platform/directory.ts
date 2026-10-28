import { SIZE_BANDS } from "@/lib/domain";
import {
  assetFilterMatches,
  countiesInMetro,
  metroByCode,
  resolveAssetSlug,
  slugsCoveredByFilter,
  specialtyBySlug,
  THIN_MARKET_MIN,
} from "@/lib/platform/catalog";
import { stateName, textHasStateCode } from "@/lib/platform/state-codes";
import { ROLES } from "@/lib/roles";

export { THIN_MARKET_MIN };

export type DirectoryPerson = {
  id: string;
  role: string;
  name: string;
  initials: string;
  org: string;
  bio: string;
  location: string;
  markets: string;
  dealTypes: string;
  assetClasses: string;
  checkSize: string;
  lookingFor: string;
  offering: string;
  nationwide: boolean;
  homeCity: string;
  homeState: string;
  homeMetro: string;
  operateStates: string[];
  operateMetros: string[];
  operateCounties: string[];
  assetSlugs: string[];
  specialtySlugs: string[];
  verified: boolean;
  createdAt: Date;
  completeness: number;
};

export type DirectoryFilter = {
  role?: string;
  group?: string;
  state?: string;
  metro?: string;
  asset?: string;
  specialty?: string;
  size?: string;
  dealType?: string;
  need?: string;
  q?: string;
  place?: string;
  verified?: string;
  sort?: string;
};

export type RankedPerson = DirectoryPerson & { rank: number; reason: string };

export type DirectoryResult = {
  rows: RankedPerson[];
  population: number;
  widened: "none" | "state" | "nationwide";
  showCount: boolean;
  banner: string | null;
  countLabel: string | null;
};

function roleInGroup(role: string, group: string): boolean {
  return ROLES.some((item) => item.id === role && item.group === group);
}

export function personPassesNiche(person: DirectoryPerson, filter: DirectoryFilter): boolean {
  if (filter.role && person.role !== filter.role) return false;
  if (filter.group && !roleInGroup(person.role, filter.group)) return false;
  if (filter.verified === "1" && !person.verified) return false;
  if (filter.specialty && !person.specialtySlugs.includes(filter.specialty)) return false;
  if (filter.asset && !assetFilterMatches(person.assetSlugs.length ? person.assetSlugs : legacyFromText(person.assetClasses), filter.asset)) {
    return false;
  }
  if (filter.size && !dealSizeMatches(person.checkSize, filter.size)) return false;
  if (filter.dealType && !person.dealTypes.toLowerCase().includes(filter.dealType.toLowerCase())) return false;
  if (filter.need && !needMatches(person, filter.need)) return false;
  const query = (filter.q ?? "").trim().toLowerCase();
  if (query) {
    const blob = `${person.name} ${person.org} ${person.bio} ${person.homeCity} ${person.location}`.toLowerCase();
    if (!blob.includes(query)) return false;
  }
  return true;
}

function legacyFromText(assetClasses: string): string[] {
  return assetClasses
    .split(",")
    .map((item) => resolveAssetSlug(item))
    .filter((item): item is string => Boolean(item));
}

export function dealSizeMatches(checkSize: string, bandId: string): boolean {
  if (!bandId) return true;
  const band = SIZE_BANDS.find((item) => item.id === bandId);
  if (!band) return true;
  const text = checkSize.trim().toLowerCase().replace(/–/g, "-");
  if (!text) return false;
  if (text === band.id || text === band.label.toLowerCase().replace(/–/g, "-")) return true;
  if (band.id === "under-1") return /under\s*\$?\s*1/.test(text);
  if (band.id === "1-5") return /1\s*-\s*5/.test(text);
  if (band.id === "5+") return /5\s*m?\s*\+|\$5m\+|5m\+/.test(text);
  return false;
}

function needMatches(person: DirectoryPerson, need: string): boolean {
  const text = `${person.dealTypes} ${person.lookingFor} ${person.offering}`.toLowerCase();
  if (need === "equity") return text.includes("equity");
  if (need === "debt") return text.includes("debt");
  if (need === "gc") return person.role === "GENERAL_CONTRACTOR" || text.includes("general contractor");
  if (need === "broker") return person.role === "BROKER" || person.role === "MORTGAGE_BROKER" || /\bbroker\b/.test(text);
  if (need === "advisory") return text.includes("advisory") || text.includes("legal") || ["RE_ATTORNEY", "SECURITIES_ATTORNEY", "ZONING_ATTORNEY", "INSURANCE", "ARCHITECT_ENGINEER", "ACCOUNTANT", "APPRAISER", "PROPERTY_MANAGER", "EXCHANGE_1031"].includes(person.role);
  return true;
}

function coversMetro(person: DirectoryPerson, metro: string, place: string): boolean {
  const home = !place || place === "either" || place === "home";
  const operates = !place || place === "either" || place === "operates";
  if (home && person.homeMetro === metro) return true;
  if (operates && person.operateMetros.includes(metro)) return true;
  if (operates && person.operateCounties.some((county) => countiesInMetro(metro).some((item) => item.fips === county))) return true;
  const metroRow = metroByCode(metro);
  if (operates && metroRow && person.operateStates.some((state) => metroRow.states.includes(state))) return true;
  return false;
}

function coversState(person: DirectoryPerson, state: string, place: string): boolean {
  const code = state.toUpperCase();
  const home = !place || place === "either" || place === "home";
  const operates = !place || place === "either" || place === "operates";
  if (home && person.homeState === code) return true;
  if (operates && person.operateStates.includes(code)) return true;
  if (!person.homeState && !person.operateStates.length) {
    return textHasStateCode(person.location, person.markets, code);
  }
  return false;
}

export function localPopulation(people: DirectoryPerson[], filter: DirectoryFilter): number {
  return people.filter((person) => {
    if (filter.role && person.role !== filter.role) return false;
    if (filter.group && !roleInGroup(person.role, filter.group)) return false;
    if (person.nationwide && !strictLocal(person, filter)) return false;
    return strictLocal(person, filter);
  }).length;
}

function strictLocal(person: DirectoryPerson, filter: DirectoryFilter): boolean {
  if (filter.metro) return coversMetro(person, filter.metro, filter.place || "either");
  if (filter.state) return coversState(person, filter.state, filter.place || "either");
  return false;
}

function inStateScope(person: DirectoryPerson, filter: DirectoryFilter): boolean {
  const states = filter.metro ? metroByCode(filter.metro)?.states ?? [] : filter.state ? [filter.state.toUpperCase()] : [];
  return states.some((state) => coversState(person, state, filter.place || "either") || person.homeState === state || person.operateStates.includes(state));
}

export function rankBucket(person: DirectoryPerson, filter: DirectoryFilter): { rank: number; reason: string } {
  const metro = filter.metro ? metroByCode(filter.metro) : undefined;
  const place = filter.place || "either";
  if (metro && (place === "either" || place === "home") && person.homeMetro === metro.code) {
    return { rank: 500, reason: `Home base in ${metro.short} metro` };
  }
  if (metro && (place === "either" || place === "operates") && (person.operateMetros.includes(metro.code) || person.operateCounties.some((county) => countiesInMetro(metro.code).some((item) => item.fips === county)))) {
    return { rank: 400, reason: `Works in ${metro.short} metro` };
  }
  if (metro && (place === "either" || place === "operates") && person.operateStates.some((state) => metro.states.includes(state))) {
    return { rank: 350, reason: `Works in ${metro.states.map((state) => stateName(state)).join(" / ")}` };
  }
  const state = (filter.state || metro?.states[0] || "").toUpperCase();
  if (state && (place === "either" || place === "home") && person.homeState === state) {
    return { rank: 300, reason: `Home base in ${stateName(state)}` };
  }
  if (state && person.homeState && metro?.states.includes(person.homeState) && (place === "either" || place === "home")) {
    return { rank: 280, reason: `Home base in ${stateName(person.homeState)}` };
  }
  if (state && (place === "either" || place === "operates") && person.operateStates.includes(state)) {
    return { rank: 200, reason: `Works in ${stateName(state)}` };
  }
  if (!person.homeState && !person.operateStates.length && state && textHasStateCode(person.location, person.markets, state)) {
    return { rank: 260, reason: `Home base in ${stateName(state)}` };
  }
  if (person.nationwide && place !== "home") return { rank: 100, reason: "Works nationwide" };
  return { rank: 0, reason: "" };
}

export function searchDirectory(
  people: DirectoryPerson[],
  filter: DirectoryFilter,
  census?: { local?: number; statePop?: number },
): DirectoryResult {
  const marketOn = Boolean(filter.metro || filter.state);
  const niche = people.filter((person) => personPassesNiche(person, filter));
  const population = census?.local ?? (marketOn ? localPopulation(people, { role: filter.role, group: filter.group, state: filter.state, metro: filter.metro, place: filter.place }) : niche.length);
  let widened: DirectoryResult["widened"] = "none";
  if (marketOn && population < THIN_MARKET_MIN) {
    widened = filter.metro ? "state" : "nationwide";
    if (widened === "state") {
      const statePop =
        census?.statePop ??
        people.filter((person) => {
          if (filter.role && person.role !== filter.role) return false;
          if (filter.group && !roleInGroup(person.role, filter.group)) return false;
          return inStateScope(person, filter);
        }).length;
      if (statePop < THIN_MARKET_MIN) widened = "nationwide";
    }
  }
  const picked = niche.filter((person) => {
    if (!marketOn) return true;
    const bucket = rankBucket(person, filter);
    if (widened === "nationwide") return true;
    if (widened === "state") return bucket.rank >= 200 || bucket.rank === 100 || inStateScope(person, filter);
    return bucket.rank >= 350 || bucket.rank === 100;
  });
  const rows = picked
    .map((person) => {
      const bucket = rankBucket(person, filter);
      const assetHit = filter.asset ? assetFilterMatches(person.assetSlugs, filter.asset) : false;
      const tie =
        (person.verified ? 20 : 0) +
        (assetHit ? 10 : 0) +
        Math.min(9, person.completeness) +
        person.createdAt.getTime() / 1e15;
      return { ...person, rank: (bucket.rank || (widened === "nationwide" ? 10 : 0)) + tie, reason: bucket.reason || (widened === "nationwide" ? "Shown while this market is growing" : "") };
    })
    .filter((person) => person.rank > 0 || !marketOn);
  const explicit = filter.sort === "name" || filter.sort === "name-za" || filter.sort === "newest";
  if (!marketOn && filter.sort !== "match") {
    rows.sort((a, b) => directoryAlpha(a, b, filter.sort));
  } else if (marketOn && explicit) {
    rows.sort((a, b) => directoryAlpha(a, b, filter.sort));
  } else {
    rows.sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name));
  }
  const thin = marketOn && population < THIN_MARKET_MIN;
  const banner = !thin
    ? null
    : widened === "nationwide"
      ? "Growing market. Results also include members nationwide."
      : "Growing market. Results also include this state.";
  const countLabel = thin ? "Growing market" : `${rows.length} member${rows.length === 1 ? "" : "s"}`;
  return { rows, population, widened, showCount: !thin, banner, countLabel };
}

function directoryAlpha(a: DirectoryPerson, b: DirectoryPerson, sort: string | undefined): number {
  if (sort === "name-za") return b.name.localeCompare(a.name);
  if (sort === "newest") return b.createdAt.getTime() - a.createdAt.getTime();
  return a.name.localeCompare(b.name);
}

export function assetLabelsForSlugs(slugs: string[], limit = 3): string[] {
  return slugs
    .map((slug) => resolveAssetSlug(slug) || slug)
    .filter((slug, index, all) => all.indexOf(slug) === index)
    .slice(0, limit);
}

export function coveredSlugs(filter: string): string[] {
  return slugsCoveredByFilter(filter);
}

export function specialtyLabel(slug: string): string {
  return specialtyBySlug(slug)?.label ?? slug;
}
