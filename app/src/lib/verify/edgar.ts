import { politeFetch } from "@/lib/verify/fetch";
import { distinctiveCompanyTokens, isDistinctiveCompanyToken, mentionsPerson, surnameForSearch } from "@/lib/verify/public-match";
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

const LEGAL_SUFFIX = new Set(["llc", "inc", "incorporated", "corp", "corporation", "co", "ltd", "limited", "plc", "lp", "llp", "pc", "pllc"]);

/** Lowercase name with punctuation and legal suffixes removed. "CBRE Group, Inc." and "CBRE GROUP INC" both become "cbre group". */
export function normalizeFirmName(value: string): string {
  return value
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase()
    .replace(/&amp;/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !LEGAL_SUFFIX.has(token))
    .join(" ");
}

/**
 * EDGAR matches on a normalized exact name, or on a ticker that is the whole applicant name.
 * A shared generic word such as group, capital, or realty is not a match.
 * "toll" does not match "Toll Brothers".
 */
export function edgarCompanyMatches(title: string, org: string, ticker = ""): boolean {
  const distinctive = distinctiveCompanyTokens(org).filter((token) => isDistinctiveCompanyToken(token));
  if (!distinctive.length) return false;
  const left = normalizeFirmName(org);
  const right = normalizeFirmName(title);
  if (left && left === right) return true;
  const symbol = ticker.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!symbol || symbol.length < 2) return false;
  return left.replace(/\s+/g, "") === symbol;
}

/** A shared first word is not enough when the SEC title names a different firm. */
export function edgarTitleFits(title: string, org: string, ticker = ""): boolean {
  return edgarCompanyMatches(title, org, ticker);
}

function tickerPreference(ticker: string, org: string): [number, number, number] {
  const symbol = ticker.trim().toUpperCase();
  const punctuated = /[-.]/.test(symbol) ? 1 : 0;
  const compact = normalizeFirmName(org).replace(/\s+/g, "");
  const aligned = compact.startsWith(symbol.toLowerCase()) ? 0 : 1;
  return [punctuated, aligned, symbol.length || 99];
}

function preferTicker(left: [number, number, number], right: [number, number, number]): boolean {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index];
  }
  return false;
}

/** The SEC row whose normalized name is this firm. A shorter plain ticker wins ties, so Sachem Capital resolves to SACH. */
export function matchEdgarCompany(rows: EdgarCompany[], org: string): EdgarCompany | null {
  let best: EdgarCompany | null = null;
  let bestWords = Number.POSITIVE_INFINITY;
  let bestTicker: [number, number, number] = [1, 1, 99];
  for (const row of rows) {
    if (!edgarCompanyMatches(row.title, org, row.ticker)) continue;
    const words = normalizeFirmName(row.title).split(/\s+/).filter(Boolean).length;
    const preference = tickerPreference(row.ticker, org);
    const betterName = words < bestWords;
    const betterTicker = words === bestWords && preferTicker(preference, bestTicker);
    if (!best || betterName || betterTicker) {
      best = row;
      bestWords = words;
      bestTicker = preference;
    }
  }
  return best;
}

/** Quoted company-name search. Generic-only names such as "Group" or "Holdings" are not searched. */
export function edgarCompanySearchPhrase(org: string): string {
  const distinctive = distinctiveCompanyTokens(org).filter((token) => isDistinctiveCompanyToken(token));
  if (!distinctive.length) return "";
  return org
    .replace(/\([^)]*\)/g, " ")
    .replace(/[,.]/g, " ")
    .split(/\s+/)
    .filter((token) => {
      const bare = token.toLowerCase().replace(/[^a-z0-9]/g, "");
      return bare.length >= 2 && !LEGAL_SUFFIX.has(bare);
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Kennedy-Wilson Holdings, Inc.  (KW)  (CIK 0001408100)" keeps the title, ticker, and CIK. */
export function companyFromDisplayName(name: string): EdgarCompany | null {
  const cik = name.match(/\(\s*CIK\s*0*(\d+)\s*\)/i)?.[1] || "";
  const withoutCik = name.replace(/\(\s*CIK\s*\d+\s*\)/gi, " ");
  const ticker = withoutCik.match(/\(\s*([A-Z][A-Z0-9.-]{0,9})\s*\)/)?.[1] || "";
  const title = withoutCik.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (!title) return null;
  return { title, ticker, cik };
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
    input.filingNames.map(companyFromDisplayName).filter((row): row is EdgarCompany => Boolean(row)),
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
  const personTied = Boolean(personLine);
  return {
    status: "PASS",
    corroborates: personTied,
    url: edgarCompanyUrl(match.cik),
    finding: personTied
      ? `EDGAR lists ${titled}. Confirm it is the same firm.${personSentence}`
      : `EDGAR lists ${titled}. That shows a company by this name exists. It does not tie the person to the firm.`,
  };
}

type FetchText = (url: string) => Promise<{ ok: boolean; status: number; text: string }>;

async function defaultFetch(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  const cap = url.includes("company_tickers") ? 2_000_000 : 1_500_000;
  const timeout = url.includes("company_tickers") ? 20000 : 15000;
  return politeFetch(url, timeout, { maxChars: cap });
}

export function clearEdgarTickerCache(): void {
  tickerCache = null;
}

async function loadTickers(fetchText: FetchText): Promise<EdgarCompany[] | null> {
  if (tickerCache && Date.now() - tickerCache.at < TICKER_TTL_MS) return tickerCache.rows;
  const response = await fetchText(TICKER_URL);
  const rows = response.ok ? parseCompanyTickers(response.text) : null;
  if (rows) tickerCache = { at: Date.now(), rows };
  return rows;
}

export async function lookupEdgar(
  org: string,
  person: string,
  fetchText?: FetchText,
): Promise<Pick<CheckOutput, "status" | "finding" | "url" | "corroborates">> {
  const tokens = org.trim();
  if (!tokens) {
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      url: "",
      finding: "EDGAR was not searched. No company name was on the application.",
    };
  }
  const fetchImpl = fetchText ?? defaultFetch;
  const companies = await loadTickers(fetchImpl).catch(() => null);
  const last = surnameForSearch(person);
  const distinctive = distinctiveCompanyTokens(org)[0] || org;
  const phrase = edgarCompanySearchPhrase(org);
  const personQuery = last ? `"${last}" "${distinctive}"` : "";
  const companyQuery = phrase ? `"${phrase}"` : "";
  const queries = [...new Set([personQuery, companyQuery].filter(Boolean))];
  let names: string[] = [];
  for (const query of queries) {
    const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(query)}&dateRange=custom&startdt=2015-01-01&enddt=2030-01-01`;
    const filing = await fetchImpl(searchUrl).catch(() => ({ ok: false, status: 0, text: "" }));
    if (filing.ok) names.push(...(filingNames(filing.text) || []));
  }
  return assessEdgarMatch({
    org,
    person,
    tickersOk: Boolean(companies),
    companies: companies || [],
    filingNames: names,
  });
}
