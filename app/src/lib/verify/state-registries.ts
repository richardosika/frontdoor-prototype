import { normalizeRegistryName, registryNameLiterals } from "@/lib/verify/ny-registry";
import { domainBrand } from "@/lib/verify/public-match";
import type { CheckOutput } from "@/lib/verify/types";

const REGISTRY_EXTRA = new Set(["construction", "builders", "development", "properties", "group", "company", "companies"]);

/** "Hensel Phelps Construction Co." is Hensel Phelps plus an industry word, when the domain agrees. */
function registryNameExtends(listed: string, org: string, website: string): boolean {
  const orgTokens = normalizeRegistryName(org).split(/\s+/).filter(Boolean);
  const listedTokens = normalizeRegistryName(listed).split(/\s+/).filter(Boolean);
  if (!orgTokens.length || listedTokens.length <= orgTokens.length) return false;
  if (listedTokens.slice(0, orgTokens.length).join(" ") !== orgTokens.join(" ")) return false;
  const extra = listedTokens.slice(orgTokens.length);
  if (!extra.length || !extra.every((token) => REGISTRY_EXTRA.has(token))) return false;
  const stem = domainBrand(website);
  return Boolean(stem) && stem === orgTokens.join("");
}

/**
 * Official open-data portals that answered a keyless request from this server.
 * Company name only. Officer, agent, and person columns are not selected and never corroborate a person.
 */
export type RegistryPortal = {
  state: string;
  label: string;
  source: string;
  dataset: string;
  portalUrl: string;
  nameField: string;
  statusField?: string;
};

export const FREE_REGISTRIES: RegistryPortal[] = [
  {
    state: "NY",
    label: "NY Active Corporations",
    source: "NY Active Corporations",
    dataset: "https://data.ny.gov/resource/n9v6-gdp6.json",
    portalUrl: "https://data.ny.gov/d/n9v6-gdp6",
    nameField: "current_entity_name",
  },
  {
    state: "CT",
    label: "Connecticut Business Registry",
    source: "Connecticut Business Registry",
    dataset: "https://data.ct.gov/resource/n7gp-d28j.json",
    portalUrl: "https://data.ct.gov/Business/Connecticut-Business-Registry-Business-Master/n7gp-d28j",
    nameField: "name",
    statusField: "status",
  },
  {
    state: "CO",
    label: "Colorado Business Entities",
    source: "Colorado Business Entities",
    dataset: "https://data.colorado.gov/resource/4ykn-tg5h.json",
    portalUrl: "https://data.colorado.gov/Business/Business-Entities-in-Colorado/4ykn-tg5h",
    nameField: "entityname",
    statusField: "entitystatus",
  },
  {
    state: "OR",
    label: "Oregon Active Businesses",
    source: "Oregon Active Businesses",
    dataset: "https://data.oregon.gov/resource/tckn-sxa6.json",
    portalUrl: "https://data.oregon.gov/Business/Active-Businesses-ALL/tckn-sxa6",
    nameField: "business_name",
  },
  {
    state: "PA",
    label: "Pennsylvania registered businesses",
    source: "Pennsylvania registered businesses",
    dataset: "https://data.pa.gov/resource/xvd7-5r2c.json",
    portalUrl: "https://data.pa.gov/Government-That-Works/Registered-Businesses-in-PA-Current-Monthly-County/xvd7-5r2c",
    nameField: "business_name",
  },
];

/**
 * Checked from this server and not usable as a keyless company-name API.
 * Other states keep a manual link and stay not checkable for free.
 */
export const REGISTRY_NOT_CHECKABLE: { state: string; reason: string }[] = [
  { state: "NJ", reason: "No free API. data.nj.gov has no business-entity dataset. The Division of Revenue search is a web form." },
  { state: "WA", reason: "data.wa.gov business datasets are non-tabular. SODA row access returns 403." },
  { state: "IA", reason: "No keyless Socrata business-entity API responded. data.iowa.gov is not a SODA catalog." },
  { state: "TX", reason: "data.texas.gov has no business-entity registry dataset." },
  { state: "FL", reason: "No data.florida.gov SODA catalog." },
  { state: "DE", reason: "data.delaware.gov has no business-entity dataset." },
  { state: "IL", reason: "data.illinois.gov has no business-entity dataset." },
  { state: "CA", reason: "No keyless secretary-of-state API was found." },
  { state: "MA", reason: "No data.mass.gov SODA catalog." },
  { state: "MD", reason: "No data.maryland.gov SODA catalog." },
];

const ACTIVE_STATUS = /^(active|good standing|current|exists|in existence)$/i;

export function registryPortal(state: string): RegistryPortal | undefined {
  return FREE_REGISTRIES.find((portal) => portal.state === state.toUpperCase());
}

export function socrataRegistryUrl(portal: RegistryPortal, org: string): string {
  const names = registryNameLiterals(org).map((name) => `'${name.replace(/'/g, "''")}'`);
  const params = new URLSearchParams();
  params.set("$select", [portal.nameField, portal.statusField].filter(Boolean).join(","));
  params.set("$limit", names.length ? "10" : "0");
  if (names.length) params.set("$where", `upper(${portal.nameField}) in(${names.join(",")})`);
  return `${portal.dataset}?${params.toString()}`;
}

function statusIsActive(status: string): boolean {
  if (!status.trim()) return true;
  return ACTIVE_STATUS.test(status.trim());
}

/** Exact normalized company name. Person and agent fields are ignored even if a portal sends them. */
export function assessStateRegistry(
  portal: RegistryPortal,
  org: string,
  response: { ok: boolean; status: number; text: string },
  website = "",
): Pick<CheckOutput, "status" | "finding" | "url" | "corroborates"> {
  const url = portal.portalUrl;
  if (!org.trim()) {
    return {
      status: "NOT_RUN",
      corroborates: false,
      url,
      finding: `${portal.label} was not searched. No company name was on the application. This is not a pass.`,
    };
  }
  if (!response.ok || !response.text.trim()) {
    return {
      status: "UNAVAILABLE",
      corroborates: false,
      url,
      finding: `${portal.label} could not be checked. The open-data list did not respond. This is not a pass.`,
    };
  }
  let rows: Record<string, unknown>[];
  try {
    const parsed = JSON.parse(response.text) as unknown;
    if (!Array.isArray(parsed)) throw new Error("shape");
    rows = parsed as Record<string, unknown>[];
  } catch {
    return {
      status: "UNAVAILABLE",
      corroborates: false,
      url,
      finding: `${portal.label} could not be checked. The open-data list did not return a readable file. This is not a pass.`,
    };
  }
  const want = normalizeRegistryName(org);
  const hits = rows.filter((row) => normalizeRegistryName(String(row[portal.nameField] || "")) === want && want);
  const active = hits.find((row) => !portal.statusField || statusIsActive(String(row[portal.statusField] || "")));
  if (active) {
    const listed = String(active[portal.nameField] || org);
    return {
      status: "PASS",
      corroborates: false,
      url,
      finding: `${portal.label} lists ${listed}. That shows a company by this exact name exists. It does not tie a person to the firm.`,
    };
  }
  if (hits.length) {
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      url,
      finding: `${portal.label} has this exact name, but not in an active status. This is not a pass.`,
    };
  }
  const extended = website
    ? rows.find((row) => {
        const listed = String(row[portal.nameField] || "");
        return registryNameExtends(listed, org, website) && (!portal.statusField || statusIsActive(String(row[portal.statusField] || "")));
      })
    : undefined;
  if (extended) {
    const listed = String(extended[portal.nameField] || org);
    return {
      status: "PASS",
      corroborates: false,
      url,
      finding: `${portal.label} lists ${listed}. That shows a company by this name exists. It does not tie a person to the firm.`,
    };
  }
  return {
    status: "INCONCLUSIVE",
    corroborates: false,
    url,
    finding: `${portal.label} responded. No entity uses this exact name. A similar name is not a match, and this is not a pass.`,
  };
}
