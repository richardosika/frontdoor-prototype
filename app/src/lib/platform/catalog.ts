import type { MemberRole } from "@prisma/client";
import { ASSET_CLASSES } from "@/lib/member-network";
import { STATE_NAMES } from "@/lib/platform/state-codes";

export type MetroSeed = {
  code: string;
  short: string;
  name: string;
  states: string[];
  cities: string[];
};

export type CountySeed = {
  fips: string;
  name: string;
  state: string;
  metro: string;
};

/** OMB Bulletin 23-01 names and codes for major metropolitan areas. County rows are principal counties only. */
export const METROS: MetroSeed[] = [
  { code: "35620", short: "New York", name: "New York-Newark-Jersey City, NY-NJ", states: ["NY", "NJ"], cities: ["new york", "brooklyn", "newark", "jersey city", "hoboken", "edison", "hackensack", "morristown", "parsippany", "white plains", "new brunswick"] },
  { code: "31080", short: "Los Angeles", name: "Los Angeles-Long Beach-Anaheim, CA", states: ["CA"], cities: ["los angeles", "long beach", "anaheim", "santa ana", "irvine", "pasadena"] },
  { code: "16980", short: "Chicago", name: "Chicago-Naperville-Elgin, IL-IN", states: ["IL", "IN"], cities: ["chicago", "naperville", "elgin", "evanston", "schaumburg"] },
  { code: "19100", short: "Dallas", name: "Dallas-Fort Worth-Arlington, TX", states: ["TX"], cities: ["dallas", "fort worth", "arlington", "plano", "irving", "frisco"] },
  { code: "26420", short: "Houston", name: "Houston-Pasadena-The Woodlands, TX", states: ["TX"], cities: ["houston", "pasadena", "sugar land", "the woodlands", "conroe"] },
  { code: "47900", short: "Washington", name: "Washington-Arlington-Alexandria, DC-VA-MD-WV", states: ["DC", "VA", "MD", "WV"], cities: ["washington", "arlington", "alexandria", "bethesda", "rockville"] },
  { code: "33100", short: "Miami", name: "Miami-Fort Lauderdale-West Palm Beach, FL", states: ["FL"], cities: ["miami", "fort lauderdale", "west palm beach", "miami beach", "boca raton"] },
  { code: "37980", short: "Philadelphia", name: "Philadelphia-Camden-Wilmington, PA-NJ-DE-MD", states: ["PA", "NJ", "DE", "MD"], cities: ["philadelphia", "camden", "wilmington"] },
  { code: "12060", short: "Atlanta", name: "Atlanta-Sandy Springs-Roswell, GA", states: ["GA"], cities: ["atlanta", "sandy springs", "roswell", "marietta"] },
  { code: "38060", short: "Phoenix", name: "Phoenix-Mesa-Chandler, AZ", states: ["AZ"], cities: ["phoenix", "mesa", "chandler", "scottsdale", "tempe", "gilbert"] },
  { code: "14460", short: "Boston", name: "Boston-Cambridge-Newton, MA-NH", states: ["MA", "NH"], cities: ["boston", "cambridge", "newton"] },
  { code: "41860", short: "San Francisco", name: "San Francisco-Oakland-Fremont, CA", states: ["CA"], cities: ["san francisco", "oakland", "fremont", "berkeley"] },
  { code: "40140", short: "Riverside", name: "Riverside-San Bernardino-Ontario, CA", states: ["CA"], cities: ["riverside", "san bernardino", "ontario"] },
  { code: "19820", short: "Detroit", name: "Detroit-Warren-Dearborn, MI", states: ["MI"], cities: ["detroit", "warren", "dearborn"] },
  { code: "42660", short: "Seattle", name: "Seattle-Tacoma-Bellevue, WA", states: ["WA"], cities: ["seattle", "tacoma", "bellevue", "redmond"] },
  { code: "33460", short: "Minneapolis", name: "Minneapolis-St. Paul-Bloomington, MN-WI", states: ["MN", "WI"], cities: ["minneapolis", "st. paul", "saint paul", "bloomington"] },
  { code: "41740", short: "San Diego", name: "San Diego-Chula Vista-Carlsbad, CA", states: ["CA"], cities: ["san diego", "chula vista", "carlsbad"] },
  { code: "45300", short: "Tampa", name: "Tampa-St. Petersburg-Clearwater, FL", states: ["FL"], cities: ["tampa", "st. petersburg", "clearwater"] },
  { code: "19740", short: "Denver", name: "Denver-Aurora-Centennial, CO", states: ["CO"], cities: ["denver", "aurora", "centennial"] },
  { code: "12580", short: "Baltimore", name: "Baltimore-Columbia-Towson, MD", states: ["MD"], cities: ["baltimore", "columbia", "towson"] },
  { code: "41180", short: "St. Louis", name: "St. Louis, MO-IL", states: ["MO", "IL"], cities: ["st. louis", "saint louis"] },
  { code: "36740", short: "Orlando", name: "Orlando-Kissimmee-Sanford, FL", states: ["FL"], cities: ["orlando", "kissimmee", "sanford"] },
  { code: "16740", short: "Charlotte", name: "Charlotte-Concord-Gastonia, NC-SC", states: ["NC", "SC"], cities: ["charlotte", "concord", "gastonia"] },
  { code: "41700", short: "San Antonio", name: "San Antonio-New Braunfels, TX", states: ["TX"], cities: ["san antonio", "new braunfels"] },
  { code: "38900", short: "Portland", name: "Portland-Vancouver-Hillsboro, OR-WA", states: ["OR", "WA"], cities: ["portland", "vancouver", "hillsboro"] },
  { code: "40900", short: "Sacramento", name: "Sacramento-Roseville-Folsom, CA", states: ["CA"], cities: ["sacramento", "roseville", "folsom"] },
  { code: "12420", short: "Austin", name: "Austin-Round Rock-San Marcos, TX", states: ["TX"], cities: ["austin", "round rock", "san marcos"] },
  { code: "38300", short: "Pittsburgh", name: "Pittsburgh, PA", states: ["PA"], cities: ["pittsburgh"] },
  { code: "29820", short: "Las Vegas", name: "Las Vegas-Henderson-North Las Vegas, NV", states: ["NV"], cities: ["las vegas", "henderson", "north las vegas"] },
  { code: "17140", short: "Cincinnati", name: "Cincinnati, OH-KY-IN", states: ["OH", "KY", "IN"], cities: ["cincinnati"] },
  { code: "28140", short: "Kansas City", name: "Kansas City, MO-KS", states: ["MO", "KS"], cities: ["kansas city"] },
  { code: "18140", short: "Columbus", name: "Columbus, OH", states: ["OH"], cities: ["columbus"] },
  { code: "26900", short: "Indianapolis", name: "Indianapolis-Carmel-Greenwood, IN", states: ["IN"], cities: ["indianapolis", "carmel", "greenwood"] },
  { code: "34980", short: "Nashville", name: "Nashville-Davidson--Murfreesboro--Franklin, TN", states: ["TN"], cities: ["nashville", "murfreesboro", "franklin"] },
  { code: "41940", short: "San Jose", name: "San Jose-Sunnyvale-Santa Clara, CA", states: ["CA"], cities: ["san jose", "sunnyvale", "santa clara", "palo alto"] },
  { code: "27260", short: "Jacksonville", name: "Jacksonville, FL", states: ["FL"], cities: ["jacksonville"] },
  { code: "36420", short: "Oklahoma City", name: "Oklahoma City, OK", states: ["OK"], cities: ["oklahoma city"] },
  { code: "39580", short: "Raleigh", name: "Raleigh-Cary, NC", states: ["NC"], cities: ["raleigh", "cary"] },
  { code: "32820", short: "Memphis", name: "Memphis, TN-MS-AR", states: ["TN", "MS", "AR"], cities: ["memphis"] },
  { code: "40060", short: "Richmond", name: "Richmond, VA", states: ["VA"], cities: ["richmond"] },
  { code: "31140", short: "Louisville", name: "Louisville/Jefferson County, KY-IN", states: ["KY", "IN"], cities: ["louisville"] },
  { code: "35380", short: "New Orleans", name: "New Orleans-Metairie, LA", states: ["LA"], cities: ["new orleans", "metairie"] },
  { code: "41620", short: "Salt Lake City", name: "Salt Lake City-Murray, UT", states: ["UT"], cities: ["salt lake city", "murray"] },
  { code: "25540", short: "Hartford", name: "Hartford-West Hartford-East Hartford, CT", states: ["CT"], cities: ["hartford", "west hartford"] },
  { code: "15380", short: "Buffalo", name: "Buffalo-Cheektowaga, NY", states: ["NY"], cities: ["buffalo"] },
  { code: "13820", short: "Birmingham", name: "Birmingham, AL", states: ["AL"], cities: ["birmingham"] },
  { code: "33340", short: "Milwaukee", name: "Milwaukee-Waukesha, WI", states: ["WI"], cities: ["milwaukee", "waukesha"] },
  { code: "45940", short: "Trenton", name: "Trenton-Princeton, NJ", states: ["NJ"], cities: ["trenton", "princeton"] },
  { code: "47260", short: "Virginia Beach", name: "Virginia Beach-Chesapeake-Norfolk, VA-NC", states: ["VA", "NC"], cities: ["virginia beach", "norfolk", "chesapeake"] },
  { code: "39300", short: "Providence", name: "Providence-Warwick, RI-MA", states: ["RI", "MA"], cities: ["providence", "warwick"] },
];

export const COUNTIES: CountySeed[] = [
  { fips: "36061", name: "New York County", state: "NY", metro: "35620" },
  { fips: "36047", name: "Kings County", state: "NY", metro: "35620" },
  { fips: "36081", name: "Queens County", state: "NY", metro: "35620" },
  { fips: "36005", name: "Bronx County", state: "NY", metro: "35620" },
  { fips: "34013", name: "Essex County", state: "NJ", metro: "35620" },
  { fips: "34017", name: "Hudson County", state: "NJ", metro: "35620" },
  { fips: "34003", name: "Bergen County", state: "NJ", metro: "35620" },
  { fips: "34039", name: "Union County", state: "NJ", metro: "35620" },
  { fips: "34023", name: "Middlesex County", state: "NJ", metro: "35620" },
  { fips: "34027", name: "Morris County", state: "NJ", metro: "35620" },
  { fips: "34031", name: "Passaic County", state: "NJ", metro: "35620" },
  { fips: "34021", name: "Mercer County", state: "NJ", metro: "45940" },
  { fips: "17031", name: "Cook County", state: "IL", metro: "16980" },
  { fips: "17043", name: "DuPage County", state: "IL", metro: "16980" },
  { fips: "48113", name: "Dallas County", state: "TX", metro: "19100" },
  { fips: "48439", name: "Tarrant County", state: "TX", metro: "19100" },
  { fips: "48085", name: "Collin County", state: "TX", metro: "19100" },
  { fips: "48121", name: "Denton County", state: "TX", metro: "19100" },
  { fips: "48201", name: "Harris County", state: "TX", metro: "26420" },
  { fips: "48453", name: "Travis County", state: "TX", metro: "12420" },
  { fips: "48491", name: "Williamson County", state: "TX", metro: "12420" },
  { fips: "48029", name: "Bexar County", state: "TX", metro: "41700" },
  { fips: "04013", name: "Maricopa County", state: "AZ", metro: "38060" },
  { fips: "04021", name: "Pinal County", state: "AZ", metro: "38060" },
  { fips: "06037", name: "Los Angeles County", state: "CA", metro: "31080" },
  { fips: "06059", name: "Orange County", state: "CA", metro: "31080" },
  { fips: "06073", name: "San Diego County", state: "CA", metro: "41740" },
  { fips: "06075", name: "San Francisco County", state: "CA", metro: "41860" },
  { fips: "06001", name: "Alameda County", state: "CA", metro: "41860" },
  { fips: "06085", name: "Santa Clara County", state: "CA", metro: "41940" },
  { fips: "06067", name: "Sacramento County", state: "CA", metro: "40900" },
  { fips: "08031", name: "Denver County", state: "CO", metro: "19740" },
  { fips: "13121", name: "Fulton County", state: "GA", metro: "12060" },
  { fips: "12086", name: "Miami-Dade County", state: "FL", metro: "33100" },
  { fips: "12057", name: "Hillsborough County", state: "FL", metro: "45300" },
  { fips: "12095", name: "Orange County", state: "FL", metro: "36740" },
  { fips: "53033", name: "King County", state: "WA", metro: "42660" },
  { fips: "11001", name: "District of Columbia", state: "DC", metro: "47900" },
];

export type AssetSeed = { slug: string; label: string; parentSlug?: string; sortOrder: number };

export const ASSET_TYPES: AssetSeed[] = [
  { slug: "residential", label: "Residential", sortOrder: 10 },
  { slug: "multifamily", label: "Multifamily", parentSlug: "residential", sortOrder: 11 },
  { slug: "condo", label: "Condo", parentSlug: "residential", sortOrder: 12 },
  { slug: "build-to-rent", label: "Build-to-rent and single-family rental", parentSlug: "residential", sortOrder: 13 },
  { slug: "student-housing", label: "Student housing", parentSlug: "residential", sortOrder: 14 },
  { slug: "senior-housing", label: "Senior housing", sortOrder: 20 },
  { slug: "independent-living", label: "Independent living", parentSlug: "senior-housing", sortOrder: 21 },
  { slug: "assisted-living", label: "Assisted living", parentSlug: "senior-housing", sortOrder: 22 },
  { slug: "memory-care", label: "Memory care", parentSlug: "senior-housing", sortOrder: 23 },
  { slug: "skilled-nursing", label: "Skilled nursing", parentSlug: "senior-housing", sortOrder: 24 },
  { slug: "continuing-care", label: "Continuing care community", parentSlug: "senior-housing", sortOrder: 25 },
  { slug: "hospitality", label: "Hospitality", sortOrder: 30 },
  { slug: "select-service-hotel", label: "Select-service hotel", parentSlug: "hospitality", sortOrder: 31 },
  { slug: "full-service-hotel", label: "Full-service hotel", parentSlug: "hospitality", sortOrder: 32 },
  { slug: "extended-stay-hotel", label: "Extended-stay hotel", parentSlug: "hospitality", sortOrder: 33 },
  { slug: "boutique-hotel", label: "Independent or boutique hotel", parentSlug: "hospitality", sortOrder: 34 },
  { slug: "self-storage", label: "Self storage", sortOrder: 40 },
  { slug: "conventional-storage", label: "Conventional storage", parentSlug: "self-storage", sortOrder: 41 },
  { slug: "climate-controlled-storage", label: "Climate-controlled storage", parentSlug: "self-storage", sortOrder: 42 },
  { slug: "storage-conversion", label: "Conversion of existing building", parentSlug: "self-storage", sortOrder: 43 },
  { slug: "industrial", label: "Industrial", sortOrder: 50 },
  { slug: "warehouse", label: "Warehouse and distribution", parentSlug: "industrial", sortOrder: 51 },
  { slug: "flex", label: "Flex", parentSlug: "industrial", sortOrder: 52 },
  { slug: "cold-storage", label: "Cold storage", parentSlug: "industrial", sortOrder: 53 },
  { slug: "retail", label: "Retail", sortOrder: 60 },
  { slug: "office", label: "Office", sortOrder: 70 },
  { slug: "mixed-use", label: "Mixed-use", sortOrder: 80 },
  { slug: "land", label: "Land", sortOrder: 90 },
  { slug: "other", label: "Other", sortOrder: 100 },
];

export type FieldSeed = {
  key: string;
  label: string;
  assetSlug: string | null;
  scope: "PROFILE" | "DEAL" | "PROJECT" | "VENDOR";
  kind: "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT" | "MULTISELECT";
  unit?: string;
  options?: string[];
  filterable?: boolean;
  sortOrder: number;
};

export const ASSET_FIELDS: FieldSeed[] = [
  { key: "keys", label: "Keys", assetSlug: "hospitality", scope: "DEAL", kind: "NUMBER", unit: "keys", filterable: true, sortOrder: 1 },
  { key: "keys-operated", label: "Keys developed or operated", assetSlug: "hospitality", scope: "PROFILE", kind: "NUMBER", unit: "keys", filterable: true, sortOrder: 2 },
  { key: "brand", label: "Brand or independent", assetSlug: "hospitality", scope: "DEAL", kind: "TEXT", sortOrder: 3 },
  { key: "service-tier", label: "Service tier", assetSlug: "hospitality", scope: "DEAL", kind: "SELECT", options: ["Select-service", "Full-service", "Extended-stay", "Independent or boutique"], sortOrder: 4 },
  { key: "beds", label: "Licensed beds or units", assetSlug: "senior-housing", scope: "DEAL", kind: "NUMBER", unit: "beds", filterable: true, sortOrder: 1 },
  { key: "care-levels", label: "Care levels", assetSlug: "senior-housing", scope: "PROFILE", kind: "MULTISELECT", options: ["Independent living", "Assisted living", "Memory care", "Skilled nursing"], filterable: true, sortOrder: 2 },
  { key: "nrsf", label: "Net rentable sq ft", assetSlug: "self-storage", scope: "DEAL", kind: "NUMBER", unit: "NRSF", filterable: true, sortOrder: 1 },
  { key: "climate-share", label: "Climate-controlled", assetSlug: "self-storage", scope: "DEAL", kind: "BOOLEAN", sortOrder: 2 },
  { key: "units", label: "Units", assetSlug: "multifamily", scope: "DEAL", kind: "NUMBER", unit: "units", filterable: true, sortOrder: 1 },
  { key: "building-sqft", label: "Building sq ft", assetSlug: "industrial", scope: "DEAL", kind: "NUMBER", unit: "sq ft", filterable: true, sortOrder: 1 },
  { key: "clear-height", label: "Clear height", assetSlug: "industrial", scope: "DEAL", kind: "NUMBER", unit: "ft", sortOrder: 2 },
  { key: "stage", label: "Stage", assetSlug: null, scope: "DEAL", kind: "SELECT", options: ["Land", "Entitlement", "Pre-construction", "Under construction", "Stabilized"], sortOrder: 1 },
];

export type SpecialtySeed = { slug: string; label: string; roles: MemberRole[]; assetSlug?: string };

export const SPECIALTIES: SpecialtySeed[] = [
  { slug: "hotel-management-company", label: "Hotel management company", roles: ["PROPERTY_MANAGER"], assetSlug: "hospitality" },
  { slug: "senior-living-operator", label: "Senior-living operator", roles: ["PROPERTY_MANAGER"], assetSlug: "senior-housing" },
  { slug: "storage-builder", label: "Storage builder", roles: ["GENERAL_CONTRACTOR"], assetSlug: "self-storage" },
  { slug: "storage-operator", label: "Third-party storage operator", roles: ["PROPERTY_MANAGER"], assetSlug: "self-storage" },
  { slug: "hospitality-gc", label: "Hospitality general contractor", roles: ["GENERAL_CONTRACTOR"], assetSlug: "hospitality" },
  { slug: "senior-housing-gc", label: "Senior-housing general contractor", roles: ["GENERAL_CONTRACTOR"], assetSlug: "senior-housing" },
  { slug: "multifamily-gc", label: "Multifamily general contractor", roles: ["GENERAL_CONTRACTOR"], assetSlug: "multifamily" },
  { slug: "industrial-gc", label: "Industrial general contractor", roles: ["GENERAL_CONTRACTOR"], assetSlug: "industrial" },
  { slug: "hospitality-attorney", label: "Hospitality attorney", roles: ["RE_ATTORNEY"], assetSlug: "hospitality" },
  { slug: "healthcare-regulatory-attorney", label: "Healthcare regulatory attorney", roles: ["RE_ATTORNEY", "SECURITIES_ATTORNEY"], assetSlug: "senior-housing" },
  { slug: "zoning-land-use", label: "Zoning and land-use attorney", roles: ["ZONING_ATTORNEY"], assetSlug: "land" },
  { slug: "storage-broker", label: "Storage-focused broker", roles: ["BROKER"], assetSlug: "self-storage" },
  { slug: "industrial-broker", label: "Industrial broker", roles: ["BROKER"], assetSlug: "industrial" },
  { slug: "multifamily-manager", label: "Multifamily property manager", roles: ["PROPERTY_MANAGER"], assetSlug: "multifamily" },
];

const LEGACY_ASSET: Record<string, string> = {
  multifamily: "multifamily",
  condo: "condo",
  condominium: "condo",
  industrial: "industrial",
  office: "office",
  retail: "retail",
  "mixed-use": "mixed-use",
  "mixed use": "mixed-use",
  hospitality: "hospitality",
  hotel: "hospitality",
  land: "land",
  storage: "self-storage",
  "self storage": "self-storage",
  "self-storage": "self-storage",
  other: "other",
  "senior housing": "senior-housing",
  "assisted living": "assisted-living",
  "memory care": "memory-care",
};

export function assetBySlug(slug: string) {
  return ASSET_TYPES.find((item) => item.slug === slug);
}

export function childSlugs(slug: string): string[] {
  return ASSET_TYPES.filter((item) => item.parentSlug === slug).map((item) => item.slug);
}

export function parentSlug(slug: string): string | null {
  return assetBySlug(slug)?.parentSlug ?? null;
}

/** A group filter includes its types. A type filter also matches the group. */
export function slugsCoveredByFilter(filter: string): string[] {
  const slug = resolveAssetSlug(filter);
  if (!slug) return [];
  const parent = parentSlug(slug);
  return [...new Set([slug, ...childSlugs(slug), ...(parent ? [parent] : [])])];
}

export function resolveAssetSlug(value: string): string | null {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  if (assetBySlug(raw)) return raw;
  if (LEGACY_ASSET[raw]) return LEGACY_ASSET[raw];
  const byLabel = ASSET_TYPES.find((item) => item.label.toLowerCase() === raw);
  return byLabel?.slug ?? null;
}

export function legacyAssetSlugs(assetClasses: string): string[] {
  const slugs = new Set<string>();
  for (const part of assetClasses.split(",")) {
    const slug = resolveAssetSlug(part);
    if (slug) slugs.add(slug);
  }
  return [...slugs];
}

export function assetFilterMatches(memberSlugs: string[], filter: string): boolean {
  const wanted = slugsCoveredByFilter(filter);
  if (!wanted.length) return true;
  return memberSlugs.some((slug) => wanted.includes(slug));
}

export function directoryAssetOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = ASSET_CLASSES.map((label) => ({ value: label, label }));
  for (const asset of ASSET_TYPES) {
    if ((ASSET_CLASSES as readonly string[]).includes(asset.label)) continue;
    const parent = asset.parentSlug ? assetBySlug(asset.parentSlug) : null;
    options.push({ value: asset.slug, label: parent ? `${parent.label}: ${asset.label}` : asset.label });
  }
  return options;
}

export function isDirectoryAssetValue(value: string): boolean {
  if ((ASSET_CLASSES as readonly string[]).some((item) => item.toLowerCase() === value.toLowerCase())) return true;
  return Boolean(resolveAssetSlug(value));
}

export function metroByCode(code: string): MetroSeed | undefined {
  return METROS.find((item) => item.code === code);
}

export function isMetroCode(code: string): boolean {
  return METROS.some((item) => item.code === code);
}

export function metrosInState(state: string): MetroSeed[] {
  const code = state.toUpperCase();
  return METROS.filter((item) => item.states.includes(code));
}

export function metroForCity(city: string, state: string): MetroSeed | undefined {
  const place = city.trim().toLowerCase();
  const code = state.trim().toUpperCase();
  if (!place || !code) return undefined;
  return METROS.find((item) => item.states.includes(code) && item.cities.includes(place));
}

export function countiesInMetro(metro: string): CountySeed[] {
  return COUNTIES.filter((item) => item.metro === metro);
}

export type ClosureLink = { ancestorKind: "STATE" | "METRO"; ancestorCode: string; descendantKind: "METRO" | "COUNTY"; descendantCode: string };

export function closureLinks(): ClosureLink[] {
  const links: ClosureLink[] = [];
  for (const metro of METROS) {
    for (const state of metro.states) {
      links.push({ ancestorKind: "STATE", ancestorCode: state, descendantKind: "METRO", descendantCode: metro.code });
    }
  }
  for (const county of COUNTIES) {
    links.push({ ancestorKind: "METRO", ancestorCode: county.metro, descendantKind: "COUNTY", descendantCode: county.fips });
    links.push({ ancestorKind: "STATE", ancestorCode: county.state, descendantKind: "COUNTY", descendantCode: county.fips });
  }
  return links;
}

export function stateSeeds() {
  return STATE_NAMES.map((item) => ({ code: item.code, name: item.name }));
}

export function specialtyBySlug(slug: string) {
  return SPECIALTIES.find((item) => item.slug === slug);
}

export function isSpecialtySlug(slug: string): boolean {
  return SPECIALTIES.some((item) => item.slug === slug);
}

export function specialtiesForRole(role: string) {
  return SPECIALTIES.filter((item) => (item.roles as readonly string[]).includes(role));
}

export const THIN_MARKET_MIN = 5;

export const PLATFORM_TEST_EMAIL_DOMAIN = "platform-test.example";

export const BASELINE_CENSUS = {
  members: 19,
  applications: 2,
  crmPending: 2,
  crmApproved: 19,
  outbox: 12,
  verification: 37,
} as const;
