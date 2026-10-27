import { locationsCorroborate, nameMatchScore, normalizeName, SANCTIONS_MATCH_THRESHOLD } from "@/lib/verify/fuzzy";
import type { ApplicantFacts, CheckOutput } from "@/lib/verify/types";

export const COULD_NOT_VERIFY = "couldn't verify for free";

export function openCorporatesApiUrl(org: string): string {
  return `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(org)}&per_page=5`;
}

export function openCorporatesSearchUrl(org: string): string {
  return `https://opencorporates.com/companies?q=${encodeURIComponent(org)}`;
}

export function openSanctionsApiUrl(name: string): string {
  return `https://api.opensanctions.org/search/default?q=${encodeURIComponent(name)}&limit=5`;
}

export function openSanctionsSearchUrl(name: string): string {
  return `https://www.opensanctions.org/search/?q=${encodeURIComponent(name)}`;
}

type CompanyHit = { name: string; url: string };

export function openCorporatesCompanies(payload: string): CompanyHit[] {
  try {
    const parsed = JSON.parse(payload) as {
      results?: { companies?: { company?: { name?: string; opencorporates_url?: string } }[] };
    };
    const rows = parsed.results?.companies;
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => ({
        name: String(row.company?.name || "").trim(),
        url: String(row.company?.opencorporates_url || "").trim(),
      }))
      .filter((row) => row.name && /^https?:\/\//i.test(row.url));
  } catch {
    return [];
  }
}

type SanctionHit = { id: string; caption: string; score: number; countries: string[] };

export function openSanctionsHits(payload: string): SanctionHit[] {
  try {
    const parsed = JSON.parse(payload) as {
      results?: { id?: string; caption?: string; score?: number; properties?: { country?: string[] } }[];
    };
    if (!Array.isArray(parsed.results)) return [];
    return parsed.results
      .map((row) => ({
        id: String(row.id || ""),
        caption: String(row.caption || ""),
        score: typeof row.score === "number" ? row.score : 0,
        countries: Array.isArray(row.properties?.country) ? row.properties.country.map((item) => String(item)) : [],
      }))
      .filter((row) => row.caption);
  } catch {
    return [];
  }
}

function companyMatches(org: string, companyName: string): boolean {
  const left = normalizeName(org);
  const right = normalizeName(companyName);
  if (left.length >= 6 && (right === left || right.includes(left))) return true;
  return nameMatchScore(org, companyName) >= 0.8;
}

export function assessOpenCorporates(org: string, http: { ok: boolean; status: number; text: string }): CheckOutput {
  const searchUrl = openCorporatesSearchUrl(org || "company");
  const ranAt = new Date().toISOString();
  const base = { key: "opencorporates", weight: 0, source: "OpenCorporates", url: searchUrl, ranAt };
  if (!org.trim()) {
    return {
      ...base,
      status: "NOT_RUN",
      finding: `No company name was on the file. OpenCorporates ${COULD_NOT_VERIFY}. Not checkable for free.`,
    };
  }
  if (!http.ok || http.status === 401 || http.status === 403 || http.status === 0 || http.status === 429) {
    return {
      ...base,
      status: "UNAVAILABLE",
      finding: `OpenCorporates ${COULD_NOT_VERIFY}. The public company search did not return records without a paid token. Not checkable for free.`,
    };
  }
  const companies = openCorporatesCompanies(http.text);
  const match = companies.find((company) => companyMatches(org, company.name));
  if (match) {
    return {
      ...base,
      status: "PASS",
      url: match.url,
      corroborates: false,
      finding: `OpenCorporates returned ${match.name}. That is company-exists evidence only. It does not tie a person to the firm. Not checkable for free.`,
    };
  }
  return {
    ...base,
    status: "INCONCLUSIVE",
    finding: companies.length
      ? "OpenCorporates responded. None of the company names matched this firm. Not checkable for free."
      : "OpenCorporates responded. No company records came back for this name. Not checkable for free.",
  };
}

export function assessOpenSanctions(facts: Pick<ApplicantFacts, "name" | "org" | "location">, http: { ok: boolean; status: number; text: string }): CheckOutput {
  const query = facts.name.trim() || facts.org.trim();
  const searchUrl = openSanctionsSearchUrl(query || "name");
  const ranAt = new Date().toISOString();
  const base = { key: "opensanctions", weight: 0, source: "OpenSanctions", url: searchUrl, ranAt };
  if (!query) {
    return {
      ...base,
      status: "NOT_RUN",
      finding: `No name was on the file. OpenSanctions ${COULD_NOT_VERIFY}. Not checkable for free.`,
    };
  }
  if (!http.ok || http.status === 401 || http.status === 403 || http.status === 0 || http.status === 429) {
    return {
      ...base,
      status: "UNAVAILABLE",
      finding: `OpenSanctions ${COULD_NOT_VERIFY}. The public search did not return a list without a paid key. Not checkable for free.`,
    };
  }
  const hits = openSanctionsHits(http.text);
  const close = hits.find((hit) => hit.score >= 0.9 && nameMatchScore(query, hit.caption) >= SANCTIONS_MATCH_THRESHOLD);
  if (!close) {
    return {
      ...base,
      status: "PASS",
      url: openSanctionsApiUrl(query),
      finding: "OpenSanctions search returned no close name match. A name on a list without a country or date of birth would not be proof. Not checkable for free.",
    };
  }
  const place = close.countries.join(" ");
  const corroborated = place ? locationsCorroborate(facts.location, place) : false;
  const entityUrl = close.id ? `https://www.opensanctions.org/entities/${close.id}/` : searchUrl;
  return {
    ...base,
    status: "FAIL",
    url: entityUrl,
    hardFlag: corroborated,
    reviewFlag: !corroborated,
    finding: corroborated
      ? `OpenSanctions name match on ${close.caption}, and the location lines up. Open the entity before you decide. Not checkable for free.`
      : `Possible OpenSanctions match on ${close.caption} without country corroboration. This is not proof. Not checkable for free.`,
  };
}
