import { politeFetch } from "@/lib/verify/fetch";
import { distinctiveCompanyTokens, mentionsCompany, mentionsPerson } from "@/lib/verify/public-match";
import type { CheckOutput } from "@/lib/verify/types";

const TICKER_URL = "https://www.sec.gov/files/company_tickers.json";

export type EdgarCompany = { title: string; ticker: string; cik: string };

let tickerCache: { at: number; rows: EdgarCompany[] } | null = null;
const TICKER_TTL_MS = 6 * 60 * 60 * 1000;

export function parseCompanyTickers(payload: string): EdgarCompany[] | null {
  try {
    const parsed = JSON.parse(payload) as unknown;
    const rows = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" ? Object.values(parsed as Record<string, unknown>) : null;
    if (!rows) return null;
    const companies: EdgarCompany[] = [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const record = row as { title?: unknown; ticker?: unknown; cik_str?: unknown };
      const title = String(record.title || "").trim();
      const ticker = String(record.ticker || "").trim();
      const cik = String(record.cik_str || "").trim();
      if (title && cik) companies.push({ title, ticker, cik });
    }
    return companies.length ? companies : null;
  } catch {
    return null;
  }
}

/** A shared first word is not enough when the SEC title names a different firm. */
export function edgarTitleFits(title: string, org: string): boolean {
  if (!mentionsCompany(title, org)) return false;
  const orgTokens = new Set(distinctiveCompanyTokens(org));
  const extras = distinctiveCompanyTokens(title).filter((token) => !orgTokens.has(token));
  return !(orgTokens.size === 1 && extras.length > 0);
}

/** The shortest SEC company title that contains this firm's distinguishing words. */
export function matchEdgarCompany(rows: EdgarCompany[], org: string): EdgarCompany | null {
  let best: EdgarCompany | null = null;
  let bestWords = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    if (!edgarTitleFits(row.title, org)) continue;
    const words = row.title.split(/\s+/).filter(Boolean).length;
    if (words < bestWords) {
      best = row;
      bestWords = words;
    }
  }
  return best;
}

export function filingNames(payload: string): string[] | null {
  try {
    const parsed = JSON.parse(payload) as { hits?: { hits?: { _source?: { display_names?: unknown } }[] } };
    const hits = parsed.hits?.hits;
    if (!Array.isArray(hits)) return null;
    const names: string[] = [];
    for (const hit of hits.slice(0, 30)) {
      const display = hit._source?.display_names;
      if (!Array.isArray(display)) continue;
      for (const name of display) names.push(String(name));
    }
    return names;
  } catch {
    return null;
  }
}

export function personOnFiling(names: string[], person: string, org: string): string {
  const companyNamed = names.some((name) => edgarTitleFits(name, org));
  if (!companyNamed) return "";
  return names.find((name) => mentionsPerson(name, person)) || "";
}

export function edgarCompanyUrl(cik: string): string {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(cik)}&owner=include&count=10`;
}

export function assessEdgarMatch(input: {
  org: string;
  person: string;
  tickersOk: boolean;
  companies: EdgarCompany[];
  filingNames: string[];
}): Pick<CheckOutput, "status" | "finding" | "url" | "corroborates"> {
  const fromList = input.tickersOk ? matchEdgarCompany(input.companies, input.org) : null;
  const fromFiling = matchEdgarCompany(
    input.filingNames.map((title) => ({ title, ticker: "", cik: "" })),
    input.org,
  );
  const match = fromList || fromFiling;
  const personLine = personOnFiling(input.filingNames, input.person, input.org);
  if (!input.tickersOk && input.filingNames.length === 0) {
    return {
      status: "UNAVAILABLE",
      corroborates: false,
      url: "https://www.sec.gov/edgar/search/",
      finding: "EDGAR was blocked, timed out, or did not respond. This source could not be checked.",
    };
  }
  if (!match) {
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      url: "https://www.sec.gov/edgar/search/",
      finding: "EDGAR responded. No company on the SEC list uses this firm's name.",
    };
  }
  const titled = `${match.title}${match.ticker ? ` (${match.ticker})` : ""}`;
  const personSentence = personLine ? ` A filing names ${personLine.replace(/\s+/g, " ").trim()}.` : "";
  return {
    status: "PASS",
    corroborates: true,
    url: edgarCompanyUrl(match.cik),
    finding: `EDGAR lists ${titled}. Confirm it is the same firm.${personSentence}`,
  };
}

async function loadTickers(): Promise<EdgarCompany[] | null> {
  if (tickerCache && Date.now() - tickerCache.at < TICKER_TTL_MS) return tickerCache.rows;
  const response = await politeFetch(TICKER_URL, 20000, { maxChars: 2_000_000 });
  const rows = response.ok ? parseCompanyTickers(response.text) : null;
  if (rows) tickerCache = { at: Date.now(), rows };
  return rows;
}

export async function lookupEdgar(org: string, person: string): Promise<Pick<CheckOutput, "status" | "finding" | "url" | "corroborates">> {
  const tokens = org.trim();
  if (!tokens) {
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      url: "",
      finding: "EDGAR was not searched. No company name was on the application.",
    };
  }
  const companies = await loadTickers().catch(() => null);
  const last = person.split(/\s+/).filter((part) => part.length >= 3).slice(-1)[0] || "";
  const distinctive = org.split(/\s+/).filter((part) => part.length >= 5)[0] || org;
  const searchUrl = last
    ? `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(`"${last}" "${distinctive}"`)}&dateRange=custom&startdt=2015-01-01&enddt=2030-01-01`
    : "";
  let names: string[] = [];
  if (searchUrl) {
    const filing = await politeFetch(searchUrl, 15000, { maxChars: 1_500_000 }).catch(() => ({ ok: false, status: 0, text: "" }));
    names = filing.ok ? filingNames(filing.text) || [] : [];
  }
  return assessEdgarMatch({
    org,
    person,
    tickersOk: Boolean(companies),
    companies: companies || [],
    filingNames: names,
  });
}
