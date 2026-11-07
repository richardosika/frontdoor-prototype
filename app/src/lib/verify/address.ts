/**
 * Keyless US address sanity check.
 * A state code and a ZIP are checked locally. A full street is optionally confirmed
 * with the US Census Geocoder (geocoding.geo.census.gov), which does not need a key.
 * No USPS or Google key is used.
 */

export type ParsedAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

/** Inclusive 3-digit ZIP prefixes for each USPS state or territory code. */
const ZIP_RANGES: Record<string, [number, number][]> = {
  AL: [[350, 369]],
  AK: [[995, 999]],
  AZ: [[850, 865]],
  AR: [[716, 729]],
  CA: [[900, 961]],
  CO: [[800, 816]],
  CT: [[60, 69]],
  DE: [[197, 199]],
  DC: [[200, 205]],
  FL: [[320, 349]],
  GA: [[300, 319], [398, 399]],
  HI: [[967, 968]],
  ID: [[832, 838]],
  IL: [[600, 629]],
  IN: [[460, 479]],
  IA: [[500, 528]],
  KS: [[660, 679]],
  KY: [[400, 427]],
  LA: [[700, 714]],
  ME: [[39, 49]],
  MD: [[206, 219]],
  MA: [[10, 27]],
  MI: [[480, 499]],
  MN: [[550, 567]],
  MS: [[386, 397]],
  MO: [[630, 658]],
  MT: [[590, 599]],
  NE: [[680, 693]],
  NV: [[889, 898]],
  NH: [[30, 38]],
  NJ: [[70, 89]],
  NM: [[870, 884]],
  NY: [[5, 5], [100, 149]],
  NC: [[270, 289]],
  ND: [[580, 588]],
  OH: [[430, 459]],
  OK: [[730, 749]],
  OR: [[970, 979]],
  PA: [[150, 196]],
  RI: [[28, 29]],
  SC: [[290, 299]],
  SD: [[570, 577]],
  TN: [[370, 385]],
  TX: [[750, 799], [885, 885]],
  UT: [[840, 847]],
  VT: [[50, 59]],
  VA: [[201, 201], [220, 246]],
  WA: [[980, 994]],
  WV: [[247, 268]],
  WI: [[530, 549]],
  WY: [[820, 831]],
  PR: [[6, 9]],
  VI: [[8, 8]],
  GU: [[969, 969]],
  AS: [[967, 967]],
  MP: [[969, 969]],
};

export const US_POSTAL_CODES = new Set(Object.keys(ZIP_RANGES));

/** Full state and territory names. "Arizona" is AZ. A two-letter code is handled separately. */
const STATE_NAMES: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
  "washington dc": "DC",
  "washington d c": "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "puerto rico": "PR",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

export function stateCodeFromToken(token: string): string {
  const compact = token.toLowerCase().replace(/\./g, " ").replace(/\s+/g, " ").trim();
  if (/^[a-z]{2}$/.test(compact) && US_POSTAL_CODES.has(compact.toUpperCase())) return compact.toUpperCase();
  return STATE_NAMES[compact] || "";
}

const ZIP5 = /^\d{5}(?:-\d{4})?$/;
const STREET_SUFFIX = /\b(?:lane|ln|street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|way|court|ct|place|pl|terrace|ter)\b/i;

/** A leading zero is not a street number. "10" is fine. "01" is not treated as zero. */
function numberBelowOne(value: string): boolean {
  return /^0+\b/.test(value.trim());
}

function rejectedStreetNumber(parsed: ParsedAddress): boolean {
  if (parsed.street && numberBelowOne(parsed.street)) return true;
  return !parsed.street && STREET_SUFFIX.test(parsed.city) && numberBelowOne(parsed.city);
}

function splitStateZip(tail: string): { state: string; zip: string } | null {
  const parts = tail.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const zip = ZIP5.test(parts[parts.length - 1]) ? parts.pop() || "" : "";
  if (!parts.length) return null;
  const last = parts[parts.length - 1];
  if (/^[A-Za-z]{2}$/.test(last)) {
    const code = stateCodeFromToken(last);
    return { state: code || last.toUpperCase(), zip };
  }
  const spelled = stateCodeFromToken(parts.join(" "));
  if (spelled) return { state: spelled, zip };
  return null;
}

const UNIT_LINE = /^(?:suite|ste\.?|floor|fl\.?|unit|apt\.?|apartment|#)\b/i;

/** "New York NY 10017" keeps New York as the city. A bare "NY 10017" has no city. */
function cityWordsBeforeState(segment: string, state: string): string {
  const withoutZip = segment.replace(/\b\d{5}(?:-\d{4})?\b/, " ").replace(/\s+/g, " ").trim();
  const words = withoutZip.split(" ").filter(Boolean);
  if (words.length && words[words.length - 1].toUpperCase() === state) words.pop();
  const city = words.join(" ");
  if (!city) return "";
  if (city.toLowerCase() === state.toLowerCase()) return "";
  return city;
}

export function parseApplicationLocation(location: string): ParsedAddress | null {
  const text = location.trim().replace(/\s+/g, " ");
  if (!text) return null;
  const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const parsed = splitStateZip(parts[parts.length - 1]);
    if (parsed) {
      const head = parts.slice(0, -1).filter((part) => !UNIT_LINE.test(part));
      const embedded = cityWordsBeforeState(parts[parts.length - 1], parsed.state);
      if (head.length >= 2) {
        return {
          street: head.slice(0, -1).join(", "),
          city: head[head.length - 1],
          state: parsed.state,
          zip: parsed.zip,
        };
      }
      if (head.length === 1) {
        const only = head[0];
        if (embedded && embedded.toLowerCase() !== only.toLowerCase()) {
          return { street: only, city: embedded, state: parsed.state, zip: parsed.zip };
        }
        return { street: "", city: only, state: parsed.state, zip: parsed.zip };
      }
      return { street: "", city: embedded, state: parsed.state, zip: parsed.zip };
    }
  }
  const bare = splitStateZip(text);
  if (bare && !bare.zip.includes(" ")) return { street: "", city: "", state: bare.state, zip: bare.zip };
  return null;
}

export function statedUsState(location: string): string {
  const parsed = parseApplicationLocation(location);
  if (parsed && US_POSTAL_CODES.has(parsed.state)) return parsed.state;
  return "";
}

export function zipMatchesState(state: string, zip: string): boolean {
  const prefix = Number(zip.slice(0, 3));
  if (!Number.isInteger(prefix)) return false;
  const ranges = ZIP_RANGES[state.toUpperCase()] || [];
  return ranges.some(([start, end]) => prefix >= start && prefix <= end);
}

export type LocalAddress =
  | { kind: "absent" }
  | { kind: "unstructured" }
  | { kind: "non-us"; finding: string }
  | { kind: "invalid"; finding: string }
  | { kind: "pass"; parsed: ParsedAddress; geocode: boolean };

const CANADIAN_PROVINCES = new Set(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]);

/** Local checks only. A full street with a sane state and ZIP can still go to the Census geocoder. */
export function assessLocalAddress(location: string): LocalAddress {
  const text = location.trim();
  if (!text) return { kind: "absent" };
  const parsed = parseApplicationLocation(text);
  if (!parsed) return { kind: "unstructured" };
  if (!US_POSTAL_CODES.has(parsed.state)) {
    if (CANADIAN_PROVINCES.has(parsed.state)) {
      return { kind: "non-us", finding: "Non-US address, not checked by the Census geocoder." };
    }
    return {
      kind: "invalid",
      finding: `The address did not check out. ${parsed.state || "The state"} is not a US state code.`,
    };
  }
  if (parsed.zip && !ZIP5.test(parsed.zip)) {
    return {
      kind: "invalid",
      finding: `The address did not check out. ${parsed.zip} is not a ZIP-5.`,
    };
  }
  if (parsed.zip && !zipMatchesState(parsed.state, parsed.zip)) {
    return {
      kind: "invalid",
      finding: `The address did not check out. ZIP ${parsed.zip.slice(0, 5)} is not in the ${parsed.state} ZIP range.`,
    };
  }
  if (rejectedStreetNumber(parsed)) {
    return {
      kind: "invalid",
      finding: "The address did not check out. The street number has to be 1 or higher.",
    };
  }
  if (/\b(?:p\.?\s*o\.?\s*box|post\s+office\s+box)\b/i.test(`${parsed.street} ${parsed.city}`)) {
    return {
      kind: "invalid",
      finding: "The address did not check out. A P.O. box is not a street address.",
    };
  }
  const geocode = Boolean(parsed.street && parsed.city && parsed.state && parsed.zip);
  return { kind: "pass", parsed, geocode };
}

/** Last-token abbreviations expanded before a geocoder call. "St" and "Street" are the same street. */
const STREET_SUFFIX_FULL: Record<string, string> = {
  st: "Street",
  ave: "Avenue",
  rd: "Road",
  dr: "Drive",
  blvd: "Boulevard",
  ln: "Lane",
  ct: "Court",
  pl: "Place",
  ter: "Terrace",
  hwy: "Highway",
  pkwy: "Parkway",
  cir: "Circle",
};

export function expandStreetSuffix(street: string): string {
  const cleaned = street.replace(/\./g, "").replace(/\s+/g, " ").trim();
  const parts = cleaned.split(" ").filter(Boolean);
  if (!parts.length) return cleaned;
  const full = STREET_SUFFIX_FULL[parts[parts.length - 1].toLowerCase()];
  if (!full) return cleaned;
  parts[parts.length - 1] = full;
  return parts.join(" ");
}

/** Spelled-out suffix first, then the applicant's own form when it differs. "St" and "Street" are both tried. */
export function streetGeocodeForms(street: string): string[] {
  const cleaned = street.replace(/\./g, "").replace(/\s+/g, " ").trim();
  const expanded = expandStreetSuffix(cleaned);
  if (expanded.toLowerCase() === cleaned.toLowerCase()) return [cleaned];
  return [expanded, cleaned];
}

export function censusGeocodeUrl(parsed: ParsedAddress): string {
  const params = new URLSearchParams({
    street: parsed.street,
    city: parsed.city,
    state: parsed.state,
    zip: parsed.zip.slice(0, 5),
    benchmark: "Public_AR_Current",
    format: "json",
  });
  return `https://geocoding.geo.census.gov/geocoder/locations/address?${params.toString()}`;
}

/**
 * Keyless fallback. Census address ranges omit some real buildings
 * (250 Vesey Street, New York, NY 10281 returns no Census match).
 */
export function nominatimGeocodeUrl(parsed: ParsedAddress): string {
  const params = new URLSearchParams({
    format: "json",
    addressdetails: "1",
    limit: "5",
    countrycodes: "us",
    street: parsed.street,
    city: parsed.city,
    state: parsed.state,
    postalcode: parsed.zip.slice(0, 5),
  });
  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

function houseNumber(street: string): string {
  return street.match(/^\d+/)?.[0] || "";
}

function streetName(street: string): string {
  return expandStreetSuffix(street)
    .toLowerCase()
    .replace(/^\d+\s+/, "")
    .replace(/\s+(?:street|avenue|road|drive|boulevard|lane|court|place|terrace|highway|parkway|circle)$/, "")
    .trim();
}

function censusRowAgrees(match: unknown, parsed: ParsedAddress): boolean {
  if (!match || typeof match !== "object") return false;
  const row = match as {
    matchedAddress?: string;
    addressComponents?: { fromAddress?: string; toAddress?: string; state?: string; zip?: string };
  };
  const number = houseNumber(parsed.street);
  const zip5 = parsed.zip.slice(0, 5);
  const components = row.addressComponents;
  if (components) {
    const state = (components.state || "").toUpperCase();
    if (state && state !== parsed.state) return false;
    const zip = (components.zip || "").slice(0, 5);
    if (zip5 && zip && zip !== zip5) return false;
    const from = Number(components.fromAddress);
    const to = Number(components.toAddress);
    const wanted = Number(number);
    if (number && Number.isFinite(from) && Number.isFinite(to) && Number.isFinite(wanted)) {
      return wanted >= Math.min(from, to) && wanted <= Math.max(from, to);
    }
    if (number && components.fromAddress) return String(components.fromAddress) === number;
  }
  const matched = (row.matchedAddress || "").toUpperCase();
  if (!matched) return false;
  if (number && !new RegExp(`\\b${number}\\b`).test(matched)) return false;
  if (!matched.includes(parsed.state.toUpperCase())) return false;
  if (zip5 && !matched.includes(zip5)) return false;
  return true;
}

/** An empty match list is a miss. Only an explicit invalid-address message is a failure. */
export function geocoderSaysAddressInvalid(text: string): boolean {
  if (/"addressMatches"\s*:/.test(text)) return false;
  return /invalid address|address is invalid|not a valid address/i.test(text);
}

export function assessCensusBody(text: string, parsed?: ParsedAddress): "match" | "none" | "unreadable" {
  try {
    const body = JSON.parse(text) as { result?: { addressMatches?: unknown } };
    const matches = body.result?.addressMatches;
    if (!Array.isArray(matches)) return "unreadable";
    if (!matches.length) return "none";
    if (!parsed) return "match";
    return matches.some((match) => censusRowAgrees(match, parsed)) ? "match" : "none";
  } catch {
    return "unreadable";
  }
}

export function assessNominatimBody(text: string, parsed: ParsedAddress): "match" | "none" | "unreadable" {
  try {
    const rows = JSON.parse(text) as unknown;
    if (!Array.isArray(rows)) return "unreadable";
    if (!rows.length) return "none";
    const number = houseNumber(parsed.street);
    const wantedStreet = streetName(parsed.street);
    const zip5 = parsed.zip.slice(0, 5);
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const address = (row as { address?: Record<string, string> }).address;
      if (!address) continue;
      const house = String(address.house_number || "");
      if (number && house !== number) continue;
      const resultState = stateCodeFromToken(String(address.state || ""));
      if (resultState !== parsed.state) continue;
      const post = String(address.postcode || "").slice(0, 5);
      if (zip5 && post && post !== zip5) continue;
      const road = streetName(String(address.road || ""));
      const building = String(address.building || "").toLowerCase().replace(/\s+/g, " ").trim();
      const roadAgrees = Boolean(wantedStreet && road && road === wantedStreet);
      const buildingAgrees = Boolean(wantedStreet && building && (building === wantedStreet || building.includes(wantedStreet)));
      if (wantedStreet && !roadAgrees && !buildingAgrees) continue;
      if (wantedStreet && !road && !building) continue;
      return "match";
    }
    return "none";
  } catch {
    return "unreadable";
  }
}
