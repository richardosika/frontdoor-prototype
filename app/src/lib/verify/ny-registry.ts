import type { CheckOutput } from "@/lib/verify/types";

const LEGAL_SUFFIX = new Set(["llc", "inc", "incorporated", "corp", "corporation", "co", "ltd", "limited", "plc", "lp", "llp", "pc", "pllc"]);

const DATASET = "https://data.ny.gov/resource/n9v6-gdp6.json";

/** Lowercase name with punctuation and legal suffixes removed, for an exact company comparison. */
export function normalizeRegistryName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&amp;/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !LEGAL_SUFFIX.has(token))
    .join(" ");
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

export function nyRegistryQueryUrl(org: string): string {
  const names = registryNameLiterals(org).map((name) => `'${name.replace(/'/g, "''")}'`);
  const params = new URLSearchParams();
  if (!names.length) {
    params.set("$limit", "0");
    return `${DATASET}?${params.toString()}`;
  }
  params.set("$select", "current_entity_name,dos_id,entity_type");
  params.set("$where", `upper(current_entity_name) in(${names.join(",")})`);
  params.set("$limit", "10");
  return `${DATASET}?${params.toString()}`;
}

export function assessNyRegistry(
  org: string,
  response: { ok: boolean; status: number; text: string },
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
  if (!hit) {
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      url,
      finding: "NY Active Corporations responded. No active entity uses this exact name. A similar name is not a match, and this is not a pass.",
    };
  }
  return {
    status: "PASS",
    corroborates: false,
    url,
    finding: `NY Active Corporations lists ${String(hit.current_entity_name)}. That shows a company by this exact name exists. It does not tie a person to the firm.`,
  };
}
