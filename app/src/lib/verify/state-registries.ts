import { normalizeRegistryName, registryExactWhere, registryNameIsGenericOnly, registryNameWhere, registryQualifierMatch, relatedBrandNames } from "@/lib/verify/ny-registry";
import { domainBrand, isGenericFirmToken } from "@/lib/verify/public-match";
import { statedUsState } from "@/lib/verify/address";
import type { CheckOutput } from "@/lib/verify/types";

const REGISTRY_EXTRA = new Set(["construction", "builders", "development", "properties", "group", "company", "companies", "co"]);

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

function registryDatasetUrl(dataset: string, select: string, where: string, orderField = ""): string {
  const params = new URLSearchParams();
  params.set("$select", select);
  params.set("$limit", where ? "50" : "0");
  if (where) params.set("$where", where);
  if (where && orderField) params.set("$order", `length(${orderField})`);
  return `${dataset}?${params.toString()}`;
}

export function socrataExactUrl(portal: RegistryPortal, org: string): string {
  const select = [portal.nameField, portal.statusField].filter(Boolean).join(",");
  return registryDatasetUrl(portal.dataset, select, registryExactWhere(portal.nameField, org));
}

export function socrataRegistryUrl(portal: RegistryPortal, org: string): string {
  const select = [portal.nameField, portal.statusField].filter(Boolean).join(",");
  return registryDatasetUrl(portal.dataset, select, registryNameWhere(portal.nameField, org), portal.nameField);
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
  domainResolves = true,
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
  if (registryNameIsGenericOnly(org)) {
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      url,
      finding: `${portal.label} responded. The name is too generic to match for free. This is not a pass.`,
    };
  }
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
  const qualified = rows.find((row) => registryQualifierMatch(String(row[portal.nameField] || ""), org, website, domainResolves));
  if (qualified && (!portal.statusField || statusIsActive(String(qualified[portal.statusField] || "")))) {
    const listed = String(qualified[portal.nameField] || org);
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
    finding: `${portal.label} responded. No entity uses this exact name. A similar name is not a match, and this is not a pass.${(() => {
      const related = relatedBrandNames(
        rows.map((row) => String(row[portal.nameField] || "")),
        org,
      );
      return related.length ? ` Related names a reviewer can check: ${related.join("; ")}. This is not a pass and adds no points.` : "";
    })()}`,
  };
}

/** Keyless FDIC BankFind search. The first distinctive word is enough to retrieve the charter name. */
export function fdicBankFindUrl(org: string): string {
  const tokens = normalizeRegistryName(org)
    .split(/\s+/)
    .filter((token) => token && !isGenericFirmToken(token));
  const term = tokens[0] || normalizeRegistryName(org).split(/\s+/)[0] || org.trim();
  const params = new URLSearchParams({
    filters: "ACTIVE:1",
    search: `NAME:${term}`,
    fields: "NAME,NAMEHCR,WEBADDR,CITY,STALP,ACTIVE",
    limit: "25",
  });
  return `https://api.fdic.gov/banks/institutions?${params.toString()}`;
}

type FdicInstitution = { NAME?: string; NAMEHCR?: string; WEBADDR?: string; CITY?: string; STALP?: string; ACTIVE?: number | string };

/** An active BankFind row whose normalized name is the applicant's bank. No person tie. */
export function assessFdicBank(
  org: string,
  location: string,
  response: { ok: boolean; status: number; text: string },
): Pick<CheckOutput, "status" | "finding" | "url" | "corroborates" | "reviewFlag"> | null {
  if (!response.ok || !response.text.trim()) return null;
  let rows: FdicInstitution[] = [];
  try {
    const parsed = JSON.parse(response.text) as { data?: { data?: FdicInstitution }[] };
    rows = Array.isArray(parsed.data) ? parsed.data.map((row) => row?.data || {}) : [];
  } catch {
    return null;
  }
  if (registryNameIsGenericOnly(org)) return null;
  const want = normalizeRegistryName(org);
  const active = rows.filter((row) => Number(row.ACTIVE) === 1);
  const hit = active.find((row) => {
    const name = normalizeRegistryName(String(row.NAME || ""));
    const holding = normalizeRegistryName(String(row.NAMEHCR || ""));
    return (name && name === want) || (holding && holding === want);
  });
  if (!hit) return null;
  const state = String(hit.STALP || "").trim().toUpperCase();
  const place = [String(hit.CITY || "").trim(), state].filter(Boolean).join(" ");
  const listed = String(hit.NAME || org);
  const holding = String(hit.NAMEHCR || "").trim();
  const url = "https://banks.data.fdic.gov/bankfind-suite/bankfind";
  const applicantState = statedUsState(location);
  if (applicantState && state && applicantState !== state) {
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      reviewFlag: true,
      url,
      finding: `FDIC BankFind lists ${listed} (active, ${place}). The bank's state is ${state}, not ${applicantState} on the application. This is an attention item and not a pass.`,
    };
  }
  return {
    status: "PASS",
    corroborates: false,
    url,
    finding: `FDIC BankFind lists ${listed}${holding ? `, holding company ${holding}` : ""} (active, ${place}). That shows a company by this exact name exists. It does not tie a person to the firm.`,
  };
}
