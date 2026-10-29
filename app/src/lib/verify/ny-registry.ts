import { domainBrand } from "@/lib/verify/public-match";
import type { CheckOutput } from "@/lib/verify/types";

const LEGAL_SUFFIX = new Set(["llc", "inc", "incorporated", "corp", "corporation", "co", "ltd", "limited", "plc", "lp", "llp", "pc", "pllc"]);

const DATASET = "https://data.ny.gov/resource/n9v6-gdp6.json";

const BANK_PHRASES = [
  ["national", "association"],
  ["federal", "savings", "bank"],
];
const BANK_SINGLE = new Set(["fsb", "ssb", "na"]);

function stripTrailingBankForm(tokens: string[]): string[] {
  let rest = tokens;
  for (const phrase of BANK_PHRASES) {
    if (rest.length > phrase.length && rest.slice(-phrase.length).join(" ") === phrase.join(" ")) rest = rest.slice(0, -phrase.length);
  }
  while (rest.length > 1 && BANK_SINGLE.has(rest[rest.length - 1] || "")) rest = rest.slice(0, -1);
  return rest;
}

/** Lowercase name with punctuation and legal suffixes removed, for an exact company comparison. */
export function normalizeRegistryName(value: string): string {
  return stripTrailingBankForm(
    value
      .toLowerCase()
      .replace(/&amp;/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 2 && !LEGAL_SUFFIX.has(token)),
  ).join(" ");
}

/** Spellings that can store one normalized name in the NY corporations file. */
export function nyRegistryCandidates(org: string): string[] {
  const stem = normalizeRegistryName(org).toUpperCase();
  if (!stem) return [];
  const suffixes = ["", " INC", " INC.", " LLC", " L.L.C.", " CORP", " CORP.", " CORPORATION", " LP", " L.P.", " PC", " P.C.", " PLLC"];
  return [...new Set(suffixes.map((suffix) => `${stem}${suffix}`.trim()))];
}

/** Exact spellings to ask a registry for, including the name as typed. */
export function registryNameLiterals(org: string): string[] {
  const raw = org.trim().toUpperCase().replace(/\s+/g, " ");
  return [...new Set([raw, ...nyRegistryCandidates(org)])].filter((name) => name.length > 0);
}

/** SoQL prefix from the normalized name. Quotes are doubled. % and _ are not left in the stem. */
export function registryNamePrefix(org: string): string {
  return normalizeRegistryName(org).toUpperCase().replace(/[%_]/g, "").replace(/'/g, "''");
}

function soqlText(value: string): string {
  return value.replace(/[%_]/g, "").replace(/'/g, "''");
}

function ampVariants(value: string): string[] {
  const forms = [value];
  if (value.includes("&")) forms.push(value.replace(/&/g, " AND ").replace(/\s+/g, " ").trim());
  if (/\bAND\b/.test(value)) forms.push(value.replace(/\bAND\b/g, "&").replace(/\s+/g, " ").trim());
  return forms;
}

/** Drop a trailing Inc / LLP / L.L.C. without removing punctuation from the words that remain. */
function withoutTrailingLegalSuffix(raw: string): string {
  const tokens = raw.split(" ");
  while (tokens.length > 1) {
    const bare = tokens[tokens.length - 1].replace(/[^A-Z0-9]/g, "").toLowerCase();
    if (!LEGAL_SUFFIX.has(bare)) break;
    tokens.pop();
    if (tokens.length) tokens[tokens.length - 1] = tokens[tokens.length - 1].replace(/,+$/, "");
  }
  return tokens.join(" ").trim();
}

/**
 * Prefixes to ask a registry for. The normalized stem finds "X, L.L.C." and "Construction Co.".
 * The name as typed keeps "&", commas, and periods, so "PAUL, WEISS" is actually requested.
 */
export function registrySearchPrefixes(org: string): string[] {
  const raw = org.trim().toUpperCase().replace(/\s+/g, " ").replace(/&AMP;/g, "&");
  const forms = new Set<string>();
  if (raw) {
    for (const form of ampVariants(raw)) forms.add(form);
    const trimmed = withoutTrailingLegalSuffix(raw);
    if (trimmed && trimmed !== raw) {
      for (const form of ampVariants(trimmed)) forms.add(form);
    }
  }
  const normalized = normalizeRegistryName(org).toUpperCase().replace(/[%_]/g, "");
  if (normalized) forms.add(normalized);
  return [...forms].map(soqlText).filter((prefix) => prefix.length > 0);
}

/** SoQL OR of prefix matches. Callers still accept a row only when the normalized names are equal. */
export function registryNameWhere(field: string, org: string): string {
  const clauses = registrySearchPrefixes(org).map((prefix) => `upper(${field}) like '${prefix}%'`);
  if (!clauses.length) return "";
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(" OR ")})`;
}

export function nyRegistryQueryUrl(org: string): string {
  const where = registryNameWhere("current_entity_name", org);
  const params = new URLSearchParams();
  params.set("$select", "current_entity_name,dos_id,entity_type");
  params.set("$limit", where ? "25" : "0");
  if (where) params.set("$where", where);
  return `${DATASET}?${params.toString()}`;
}

const GEO_WORD = new Set(["us", "usa", "america"]);
const REGISTRY_EXTRA = new Set(["construction", "builders", "development", "properties", "group", "company", "companies", "co"]);

function stripTrailingGeo(tokens: string[]): { tokens: string[]; stripped: boolean } {
  if (tokens.length >= 2 && tokens[tokens.length - 2] === "north" && tokens[tokens.length - 1] === "america") {
    return { tokens: tokens.slice(0, -2), stripped: true };
  }
  if (GEO_WORD.has(tokens[tokens.length - 1] || "")) return { tokens: tokens.slice(0, -1), stripped: true };
  return { tokens, stripped: false };
}

/** The website stem is the firm name, or the initials of at least three firm words. */
export function registryDomainAgrees(org: string, website: string): boolean {
  const stem = domainBrand(website);
  const tokens = normalizeRegistryName(org).split(/\s+/).filter(Boolean);
  if (!stem || !tokens.length) return false;
  if (stem === tokens.join("")) return true;
  const initials = tokens.map((token) => token[0] || "").join("");
  return initials.length >= 3 && stem === initials;
}

/**
 * "HOGAN LOVELLS CADWALADER US LLP" is Hogan Lovells Cadwalader plus a geographic word.
 * The domain has to agree, and a domain that does not resolve does not count.
 */
export function registryQualifierMatch(listed: string, org: string, website: string, domainResolves = true): boolean {
  if (!domainResolves || !website.trim() || !registryDomainAgrees(org, website)) return false;
  const orgTokens = normalizeRegistryName(org).split(/\s+/).filter(Boolean);
  const geo = stripTrailingGeo(normalizeRegistryName(listed).split(/\s+/).filter(Boolean));
  if (!geo.stripped || !orgTokens.length || geo.tokens.length < orgTokens.length) return false;
  if (geo.tokens.slice(0, orgTokens.length).join(" ") !== orgTokens.join(" ")) return false;
  const extra = geo.tokens.slice(orgTokens.length);
  return extra.every((token) => REGISTRY_EXTRA.has(token));
}

export function assessNyRegistry(
  org: string,
  response: { ok: boolean; status: number; text: string },
  website = "",
  domainResolves = true,
): Pick<CheckOutput, "status" | "finding" | "url" | "corroborates"> {
  const url = "https://data.ny.gov/d/n9v6-gdp6";
  if (!org.trim()) {
    return {
      status: "NOT_RUN",
      corroborates: false,
      url,
      finding: "NY Active Corporations was not searched. No company name was on the application. This is not a pass.",
    };
  }
  if (!response.ok || !response.text.trim()) {
    return {
      status: "UNAVAILABLE",
      corroborates: false,
      url,
      finding: "NY Active Corporations could not be checked. The data.ny.gov list did not respond. This is not a pass.",
    };
  }
  let rows: { current_entity_name?: unknown }[];
  try {
    const parsed = JSON.parse(response.text) as unknown;
    if (!Array.isArray(parsed)) throw new Error("shape");
    rows = parsed as { current_entity_name?: unknown }[];
  } catch {
    return {
      status: "UNAVAILABLE",
      corroborates: false,
      url,
      finding: "NY Active Corporations could not be checked. The data.ny.gov list did not return a readable file. This is not a pass.",
    };
  }
  const want = normalizeRegistryName(org);
  const hit = rows.find((row) => normalizeRegistryName(String(row.current_entity_name || "")) === want && want);
  const qualified = hit
    ? undefined
    : rows.find((row) => registryQualifierMatch(String(row.current_entity_name || ""), org, website, domainResolves));
  const chosen = hit || qualified;
  if (!chosen) {
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      url,
      finding: "NY Active Corporations responded. No active entity uses this exact name. A similar name is not a match, and this is not a pass.",
    };
  }
  if (!hit && qualified) {
    return {
      status: "PASS",
      corroborates: false,
      url,
      finding: `NY Active Corporations lists ${String(qualified.current_entity_name)}. That shows a company by this name exists. It does not tie a person to the firm.`,
    };
  }
  return {
    status: "PASS",
    corroborates: false,
    url,
    finding: `NY Active Corporations lists ${String(chosen.current_entity_name)}. That shows a company by this exact name exists. It does not tie a person to the firm.`,
  };
}
