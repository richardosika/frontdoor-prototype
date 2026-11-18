import { collapseAmpersandInitials, domainBrand } from "@/lib/verify/public-match";
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
  let tokens = stripTrailingBankForm(
    collapseAmpersandInitials(value)
      .toLowerCase()
      .replace(/&amp;/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 2 && !LEGAL_SUFFIX.has(token)),
  );
  if (tokens.length > 1 && tokens[tokens.length - 1] === "company") tokens = tokens.slice(0, -1);
  return tokens.join(" ");
}

const TOO_GENERIC = new Set([
  "bank",
  "holding",
  "holdings",
  "company",
  "companies",
  "capital",
  "group",
  "partners",
  "partner",
  "properties",
  "property",
  "realty",
  "development",
  "trust",
  "sa",
]);

const RELATED_EXTRA = new Set([
  "real",
  "estate",
  "services",
  "service",
  "management",
  "commercial",
  "mortgage",
  "financial",
  "development",
  "advisors",
  "advisor",
  "company",
  "companies",
  "group",
  "properties",
  "realty",
  "capital",
  "partners",
  "holdings",
  "investment",
  "investments",
  "and",
  "of",
  "the",
  "co",
]);

/** Up to three active names that start with the brand and add only generic business words. Not a match. */
export function relatedBrandNames(names: string[], org: string): string[] {
  const orgTokens = normalizeRegistryName(org).split(/\s+/).filter(Boolean);
  if (!orgTokens.length || registryNameIsGenericOnly(org)) return [];
  const found: string[] = [];
  for (const name of names) {
    const tokens = normalizeRegistryName(name).split(/\s+/).filter(Boolean);
    if (tokens.length <= orgTokens.length) continue;
    if (tokens.slice(0, orgTokens.length).join(" ") !== orgTokens.join(" ")) continue;
    const extra = tokens.slice(orgTokens.length);
    if (extra.length && extra.every((token) => RELATED_EXTRA.has(token)) && !found.includes(name)) found.push(name);
    if (found.length >= 3) break;
  }
  return found;
}

function withRelatedNames(finding: string, names: string[], org: string): string {
  const related = relatedBrandNames(names, org);
  if (!related.length) return finding;
  return `${finding} Related names a reviewer can check: ${related.join("; ")}. This is not a pass and adds no points.`;
}

/** "bank" or "holding company" is not a firm. "mt bank" and "related companies" are. */
export function registryNameIsGenericOnly(value: string): boolean {
  const tokens = normalizeRegistryName(value).split(/\s+/).filter(Boolean);
  return !tokens.length || tokens.every((token) => TOO_GENERIC.has(token));
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
  if (value.includes("&")) {
    forms.push(value.replace(/&/g, " AND ").replace(/\s+/g, " ").trim());
    forms.push(value.replace(/\s*&\s*/g, " & ").replace(/\s+/g, " ").trim());
    forms.push(value.replace(/\s*&\s*/g, "&"));
  }
  if (/\bAND\b/.test(value)) {
    forms.push(value.replace(/\bAND\b/g, "&").replace(/\s+/g, " ").trim());
    forms.push(value.replace(/\bAND\b/g, " & ").replace(/\s+/g, " ").trim());
  }
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
  const prefixes = [...forms].map(soqlText).filter((prefix) => prefix.length > 0);
  const longer = prefixes.some((prefix) => !registryPrefixIsGeneric(prefix));
  return longer ? prefixes.filter((prefix) => !registryPrefixIsGeneric(prefix)) : prefixes;
}

const GENERIC_QUERY_WORD = new Set(["bank", "holding", "company", "capital", "group", "partners", "properties", "realty", "development"]);

/** "BANK" or "HOLDING COMPANY" must not crowd out "M&T BANK". */
export function registryPrefixIsGeneric(prefix: string): boolean {
  const tokens = prefix.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  if (tokens.length === 1 && GENERIC_QUERY_WORD.has(tokens[0])) return true;
  return tokens.length > 0 && tokens.every((token) => GENERIC_QUERY_WORD.has(token));
}

const EXACT_SUFFIXES = ["", " INC", " INC.", " LLC", " L.L.C.", " CORP", " CORP.", " CORPORATION", " LP", " L.P.", " CO", " CO.", " CO., L.L.C.", " COMPANY"];

/** Exact spellings, including spaced "&" and a legal suffix, before any prefix search. */
export function registryExactLiterals(org: string): string[] {
  const raw = org.trim().toUpperCase().replace(/\s+/g, " ").replace(/&AMP;/g, "&");
  const bases = new Set<string>();
  if (raw) {
    for (const form of ampVariants(raw)) {
      bases.add(form);
      const trimmed = withoutTrailingLegalSuffix(form);
      if (trimmed) bases.add(trimmed);
    }
  }
  const names = new Set<string>(nyRegistryCandidates(org));
  for (const base of bases) {
    for (const suffix of EXACT_SUFFIXES) names.add(`${base}${suffix}`.replace(/\s+/g, " ").trim());
  }
  return [...names].map(soqlText).filter((name) => name.length > 0);
}

export function registryExactWhere(field: string, org: string): string {
  const names = registryExactLiterals(org).map((name) => `'${name}'`);
  if (!names.length) return "";
  return `upper(${field}) in(${names.join(",")})`;
}

/** SoQL OR of prefix matches. Callers still accept a row only when the normalized names are equal. */
export function registryNameWhere(field: string, org: string): string {
  const clauses = registrySearchPrefixes(org).map((prefix) => `upper(${field}) like '${prefix}%'`);
  if (!clauses.length) return "";
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(" OR ")})`;
}

function registryUrl(dataset: string, select: string, where: string, orderField = ""): string {
  const params = new URLSearchParams();
  params.set("$select", select);
  params.set("$limit", where ? "50" : "0");
  if (where) params.set("$where", where);
  if (where && orderField) params.set("$order", `length(${orderField})`);
  return `${dataset}?${params.toString()}`;
}

/** Exact equality. This is the first request. A prefix search runs only when it returns no rows. */
export function nyRegistryExactUrl(org: string): string {
  return registryUrl(DATASET, "current_entity_name,dos_id,entity_type", registryExactWhere("current_entity_name", org));
}

export function nyRegistryQueryUrl(org: string): string {
  return registryUrl(DATASET, "current_entity_name,dos_id,entity_type", registryNameWhere("current_entity_name", org), "current_entity_name");
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
  if (registryNameIsGenericOnly(org)) {
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      url,
      finding: "NY Active Corporations responded. The name is too generic to match for free. This is not a pass.",
    };
  }
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
      finding: withRelatedNames(
        "NY Active Corporations responded. No active entity uses this exact name. A similar name is not a match, and this is not a pass.",
        rows.map((row) => String(row.current_entity_name || "")),
        org,
      ),
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
