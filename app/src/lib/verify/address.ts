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
  for (let take = parts.length; take >= 1; take -= 1) {
    const state = stateCodeFromToken(parts.slice(0, take).join(" "));
    if (!state) continue;
    return { state, zip: parts.slice(take).join(" ") };
  }
  if (/^[A-Za-z]{2}$/.test(parts[0]) && parts.length <= 2) {
    return { state: parts[0].toUpperCase(), zip: parts.slice(1).join(" ") };
  }
  return null;
}

export function parseApplicationLocation(location: string): ParsedAddress | null {
  const text = location.trim().replace(/\s+/g, " ");
  if (!text) return null;
  const comma = text.lastIndexOf(",");
  if (comma >= 0) {
    const parsed = splitStateZip(text.slice(comma + 1));
    if (parsed) {
      const before = text.slice(0, comma).trim();
      const split = before.lastIndexOf(",");
      const street = split >= 0 ? before.slice(0, split).trim() : "";
      const city = split >= 0 ? before.slice(split + 1).trim() : before;
      return { street, city, state: parsed.state, zip: parsed.zip };
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
  | { kind: "invalid"; finding: string }
  | { kind: "pass"; parsed: ParsedAddress; geocode: boolean };

/** Local checks only. A full street with a sane state and ZIP can still go to the Census geocoder. */
export function assessLocalAddress(location: string): LocalAddress {
  const text = location.trim();
  if (!text) return { kind: "absent" };
  const parsed = parseApplicationLocation(text);
  if (!parsed) return { kind: "unstructured" };
  if (!US_POSTAL_CODES.has(parsed.state)) {
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
  const geocode = Boolean(parsed.street && parsed.city && parsed.state && parsed.zip);
  return { kind: "pass", parsed, geocode };
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

export function assessCensusBody(text: string): "match" | "none" | "unreadable" {
  try {
    const parsed = JSON.parse(text) as { result?: { addressMatches?: unknown } };
    const matches = parsed.result?.addressMatches;
    if (!Array.isArray(matches)) return "unreadable";
    return matches.length > 0 ? "match" : "none";
  } catch {
    return "unreadable";
  }
}
