import { politeFetch } from "@/lib/verify/fetch";
import { distinctiveCompanyTokens, domainBrand, isDistinctiveCompanyToken, isGenericFirmToken, isShortBrandToken, isStandaloneGenericQueryToken, mentionsPerson, surnameForSearch } from "@/lib/verify/public-match";
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

function firmTokens(value: string): string[] {
  return normalizeFirmName(value).split(/\s+/).filter(Boolean);
}

function pickByTicker(rows: EdgarCompany[], org: string): EdgarCompany {
  return rows.reduce((best, row) => (preferTicker(tickerPreference(row.ticker, org), tickerPreference(best.ticker, org)) ? row : best));
}

/**
 * The typed org is itself a ticker, and the website stem is that same ticker.
 * "JLL" on jll.com is Jones Lang LaSalle. "ABC LLC" on a different domain is not ticker ABC.
 */
export function edgarTickerDomainMatch(rows: EdgarCompany[], org: string, website = ""): EdgarCompany | null {
  const compact = normalizeFirmName(org).replace(/\s+/g, "");
  if (!compact || compact.length < 2 || compact.length > 5) return null;
  const stem = domainBrand(website);
  if (!stem || stem !== compact) return null;
  const hits = rows.filter((row) => row.ticker.trim().toLowerCase().replace(/[^a-z0-9]/g, "") === compact);
  if (!hits.length) return null;
  return pickByTicker(hits, org);
}

export function padCik(cik: string): string {
  const digits = cik.replace(/\D/g, "");
  return digits ? digits.padStart(10, "0") : "";
}

export type EdgarFilerIdentity = {
  currentName: string;
  formerNames: string[];
};

export function submissionsUrl(cik: string): string {
  return `https://data.sec.gov/submissions/CIK${padCik(cik)}.json`;
}

/** Current legal name and former names from the SEC submissions JSON. */
export function parseSubmissionsIdentity(text: string): EdgarFilerIdentity | null {
  try {
    const body = JSON.parse(text) as { name?: unknown; formerNames?: unknown };
    const currentName = String(body.name || "").trim();
    if (!currentName) return null;
    const formerNames = Array.isArray(body.formerNames)
      ? body.formerNames
          .map((row) => (row && typeof row === "object" ? String((row as { name?: unknown }).name || "").trim() : ""))
          .filter(Boolean)
      : [];
    return { currentName, formerNames };
  } catch {
    return null;
  }
}

/** The ticker title or the typed org is a former name, and the current name is a different entity. */
export function matchedNameIsFormer(org: string, matchedTitle: string, identity: EdgarFilerIdentity): boolean {
  const current = normalizeFirmName(identity.currentName);
  const wanted = [normalizeFirmName(org), normalizeFirmName(matchedTitle)].filter(Boolean);
  if (!current || wanted.some((name) => name === current)) return false;
  return identity.formerNames.some((former) => {
    const normalized = normalizeFirmName(former);
    return Boolean(normalized) && wanted.some((name) => name === normalized);
  });
}

/** Forms 3, 4, and 5 for one CIK. The surname is quoted so a shared token is not the whole search. */
export function insiderSearchUrl(surname: string, cik: string, form: string): string {
  const padded = padCik(cik);
  return `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(`"${surname}"`)}&forms=${encodeURIComponent(form)}&ciks=${padded}`;
}

/** A reporting-owner display name on a CIK-scoped Form 3, 4, or 5. The company line in the same filing is not the person. */
export function reportingOwnerLine(names: string[] | string[][], person: string): string {
  for (const group of filingGroups(names)) {
    const hit = group.find((name) => mentionsPerson(name, person));
    if (hit) return hit.replace(/\s+/g, " ").trim();
  }
  return "";
}

/** "(Canada)" names a different filer. "(DE)" and a ticker in parentheses do not. */
function foreignParenthetical(title: string, orgTokens: Set<string>): boolean {
  for (const match of title.matchAll(/\(([^)]*)\)/g)) {
    for (const token of match[1].toLowerCase().split(/[^a-z0-9]+/)) {
      if (token.length < 3 || LEGAL_SUFFIX.has(token) || isGenericFirmToken(token) || orgTokens.has(token)) continue;
      return true;
    }
  }
  return false;
}

/**
 * A different filer that contains every distinctive word of this firm.
 * One shared word is not enough: Granite Ridge is not Quillfeather Ridge, and
 * Pacific Health Care Organization is not the LeFrak Organization.
 * Terra Property Trust still matches Terra, because "terra" is the whole distinctive name and the title adds other words.
 */
/**
 * Distinctive tokens for a parent guess, including a short brand such as STO, RXR, or JLL.
 * "building" and the other standalone generics do not qualify, so one shared generic word is not a parent.
 */
function parentRequiredTokens(org: string): string[] {
  return firmTokens(org).filter((token) => {
    if (isGenericFirmToken(token) || isStandaloneGenericQueryToken(token)) return false;
    return isShortBrandToken(token) || token.length >= 4;
  });
}

function partialEdgarCandidate(rows: EdgarCompany[], org: string): EdgarCompany | null {
  const required = parentRequiredTokens(org);
  // The first distinctive token has to be in the filer. "building" alone is not STO Building Group.
  const first = required[0];
  if (!first) return null;
  const orgTokens = new Set(firmTokens(org));
  let best: EdgarCompany | null = null;
  for (const row of rows) {
    const titleTokens = firmTokens(row.title);
    const titleSet = new Set(titleTokens);
    if (!titleSet.has(first)) continue;
    if (!required.every((token) => titleSet.has(token))) continue;
    const extra =
      foreignParenthetical(row.title, orgTokens) ||
      titleTokens.some((token) => !orgTokens.has(token));
    if (!extra) continue;
    best = row;
    break;
  }
  return best;
}

/**
 * A shorter parent whose distinctive name leads the applicant's name.
 * Brookfield Corporation is the parent of Brookfield Properties.
 * AECOM is the parent of AECOM Tishman. A different brand is not.
 */
function shorterParentCandidate(rows: EdgarCompany[], org: string): EdgarCompany | null {
  const orgTokens = firmTokens(org);
  const orgDistinctive = orgTokens.filter((token) => isDistinctiveCompanyToken(token) && !isStandaloneGenericQueryToken(token));
  if (!orgDistinctive.length || orgTokens.length < 2) return null;
  const orgSet = new Set(orgTokens);
  const meaningful = (tokens: string[]) => tokens.filter((token) => token.length >= 3);
  let best: EdgarCompany | null = null;
  let bestOverlap = -1;
  let bestLength = 99;
  for (const row of rows) {
    if (normalizeFirmName(row.title) === normalizeFirmName(org)) continue;
    if (foreignParenthetical(row.title, orgSet)) continue;
    const titleTokens = firmTokens(row.title);
    const titleDistinctive = titleTokens.filter((token) => isDistinctiveCompanyToken(token));
    if (!titleDistinctive.length) continue;
    if (titleDistinctive.some((token) => !orgSet.has(token))) continue;
    if (!titleDistinctive.every((token, index) => orgDistinctive[index] === token)) continue;
    const shorter = titleDistinctive.length < orgDistinctive.length || meaningful(titleTokens).length < meaningful(orgTokens).length;
    if (!shorter) continue;
    const titleLength = meaningful(titleTokens).length;
    const plainer =
      !best ||
      tickerPreference(row.ticker, org)[0] < tickerPreference(best.ticker, org)[0] ||
      (tickerPreference(row.ticker, org)[0] === tickerPreference(best.ticker, org)[0] && row.ticker.trim().length < best.ticker.trim().length);
    if (titleDistinctive.length > bestOverlap || (titleDistinctive.length === bestOverlap && titleLength < bestLength) || (titleDistinctive.length === bestOverlap && titleLength === bestLength && plainer)) {
      best = row;
      bestOverlap = titleDistinctive.length;
      bestLength = titleLength;
    }
  }
  return best;
}

function personNamedWithFirm(names: string[] | string[][], person: string, firm: string): boolean {
  for (const group of filingGroups(names)) {
    const here = group.some((name) => sameFirmName(companyFromDisplayName(name)?.title || name, firm));
    if (!here) continue;
    if (group.some((name) => mentionsPerson(name, person))) return true;
  }
  return false;
}

function listedParent(finding: string): { title: string; ticker: string } {
  const listed = finding.match(/EDGAR lists (.+?), CIK/i)?.[1] || "";
  const ticker = listed.match(/\(([A-Za-z0-9.-]+)\)\s*$/)?.[1] || "";
  const title = listed.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\/[a-z]{2}\/?/gi, " ").replace(/\s+/g, " ").trim();
  return { title, ticker };
}

function pageHasNeedle(page: string, needle: string): boolean {
  if (needle.includes(" ")) return page.toLowerCase().includes(needle.toLowerCase());
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i").test(page);
}

/**
 * A parent row earns points only when some other page names the parent as its own firm.
 * "Brookfield Corp" or the ticker BN links Brookfield Properties to that filer.
 * The shared first word alone does not. Installed Building Products does not link STO.
 */
export function independentPageLinksParent(org: string, edgarFinding: string, pages: string[]): boolean {
  const { title, ticker } = listedParent(edgarFinding);
  if (!title) return false;
  const orgTokens = new Set(firmTokens(org));
  const orgNorm = normalizeFirmName(org);
  const cleaned = title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const needles: string[] = [];
  const symbol = ticker.toLowerCase().replace(/[^a-z0-9]/g, "");
  const orgCompact = orgNorm.replace(/\s+/g, "");
  if (symbol.length >= 2 && symbol !== orgCompact) needles.push(symbol);
  for (const token of firmTokens(title)) {
    if (token.length < 4 || isGenericFirmToken(token) || isStandaloneGenericQueryToken(token)) continue;
    if (!orgTokens.has(token)) needles.push(token);
  }
  const words = cleaned.split(" ").filter(Boolean);
  const extraWord = words.some((word) => word.length >= 3 && !orgTokens.has(word) && !isStandaloneGenericQueryToken(word));
  if (cleaned && extraWord && cleaned !== orgNorm && !orgNorm.startsWith(`${cleaned} `) && !cleaned.startsWith(`${orgNorm} `)) {
    needles.push(cleaned);
  }
  const unique = [...new Set(needles)];
  if (!unique.length) return false;
  return pages.some((page) => unique.some((needle) => pageHasNeedle(page, needle)));
}

function parentMatchResult(
  row: EdgarCompany,
  personNamed: boolean,
): Pick<CheckOutput, "status" | "finding" | "url" | "corroborates" | "reviewFlag" | "companyOnly"> {
  const titled = `${row.title}${row.ticker ? ` (${row.ticker})` : ""}`;
  const personSentence = personNamed
    ? " The person is named on that parent filing and is still not credited for this company."
    : " The person is not named in that filing and is not credited.";
  return {
    status: "INCONCLUSIVE",
    corroborates: false,
    reviewFlag: true,
    companyOnly: false,
    url: edgarCompanyUrl(row.cik),
    finding: `Parent match, needs review. EDGAR lists ${titled}, CIK ${row.cik}. A parent or affiliate is not an exact match and is not a pass. It does not corroborate.${personSentence}`,
  };
}

/**
 * Exact normalized title first, so "SL Green Realty Corp" is SL GREEN REALTY CORP and not GREEN DOT.
 * A name made only of generic words, such as Group, is not a match.
 * Otherwise every non-generic token of 2 or more characters has to be in the title.
 * A title word of 3 or more characters that is not generic and not in the applicant's name is an extra, and that row is not a match.
 * One distinctive token does not claim a longer filer: Terra Group is not Terra Property Trust, and Extell is not Extell Rock LLC.
 * A parenthetical such as (Canada) is a different firm even when the remaining words match.
 * Ties keep the most applicant tokens, then the fewest extras, then the plainer ticker. The shortest title does not win.
 */
export function matchEdgarCompany(rows: EdgarCompany[], org: string): EdgarCompany | null {
  const normalized = normalizeFirmName(org);
  if (!normalized) return null;
  const orgTokens = firmTokens(org);
  const required = orgTokens.filter((token) => !isGenericFirmToken(token));
  if (!required.length) return null;
  const orgSet = new Set(orgTokens);
  const exact = rows.filter((row) => normalizeFirmName(row.title) === normalized && !foreignParenthetical(row.title, orgSet));
  if (exact.length) return pickByTicker(exact, org);
  if (required.length < 2) return null;
  const ranked: { row: EdgarCompany; matched: number; extras: number }[] = [];
  for (const row of rows) {
    const titleTokens = firmTokens(row.title);
    const titleSet = new Set(titleTokens);
    if (foreignParenthetical(row.title, orgSet)) continue;
    if (!required.every((token) => titleSet.has(token))) continue;
    const distinctiveExtra = titleTokens.some((token) => token.length >= 3 && !orgSet.has(token) && !isGenericFirmToken(token));
    if (distinctiveExtra) continue;
    const matched = orgTokens.filter((token) => titleSet.has(token)).length;
    const extras = titleTokens.filter((token) => token.length >= 3 && !orgSet.has(token)).length;
    ranked.push({ row, matched, extras });
  }
  if (!ranked.length) return null;
  const bestMatched = Math.max(...ranked.map((item) => item.matched));
  const matched = ranked.filter((item) => item.matched === bestMatched);
  const fewestExtras = Math.min(...matched.map((item) => item.extras));
  return pickByTicker(
    matched.filter((item) => item.extras === fewestExtras).map((item) => item.row),
    org,
  );
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

/** One array per filing. Names from different filings are not one record. */
export function filingNames(payload: string): string[][] | null {
  try {
    const parsed = JSON.parse(payload) as { hits?: { hits?: { _source?: { display_names?: unknown } }[] } };
    const hits = parsed.hits?.hits;
    if (!Array.isArray(hits)) return null;
    const groups: string[][] = [];
    for (const hit of hits.slice(0, 30)) {
      const display = hit._source?.display_names;
      if (!Array.isArray(display)) continue;
      const names = display.map((name) => String(name)).filter((name) => name.trim());
      if (names.length) groups.push(names);
    }
    return groups.length ? groups : null;
  } catch {
    return null;
  }
}

/** A flat list is one filing. A list of lists keeps each filing separate. */
export function filingGroups(names: string[] | string[][]): string[][] {
  if (!names.length) return [];
  if (Array.isArray(names[0])) return (names as string[][]).filter((group) => group.length > 0);
  return [names as string[]];
}

function sameFirmName(title: string, org: string): boolean {
  const left = normalizeFirmName(org);
  const right = normalizeFirmName(title);
  return Boolean(left) && left === right;
}

/**
 * The person counts only on a filing that also carries the exact company name.
 * A person on a parent, affiliate, or different registrant does not tie this company.
 */
export function personOnFiling(names: string[] | string[][], person: string, org: string): string {
  for (const group of filingGroups(names)) {
    const companyHere = group.some((name) => sameFirmName(companyFromDisplayName(name)?.title || name, org));
    if (!companyHere) continue;
    const hit = group.find((name) => mentionsPerson(name, person));
    if (hit) return hit;
  }
  return "";
}

export function edgarCompanyUrl(cik: string): string {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(cik)}&owner=include&count=10`;
}

export function assessEdgarMatch(input: {
  org: string;
  person: string;
  tickersOk: boolean;
  companies: EdgarCompany[];
  filingNames: string[] | string[][];
  website?: string;
  insiderNames?: string[] | string[][];
  identity?: EdgarFilerIdentity | null;
}): Pick<CheckOutput, "status" | "finding" | "url" | "corroborates" | "reviewFlag" | "companyOnly"> {
  const groups = filingGroups(input.filingNames);
  const flat = groups.flat();
  const fromList = input.tickersOk ? matchEdgarCompany(input.companies, input.org) : null;
  const tickerMatch = input.tickersOk ? edgarTickerDomainMatch(input.companies, input.org, input.website || "") : null;
  const fromFiling = matchEdgarCompany(
    flat.map(companyFromDisplayName).filter((row): row is EdgarCompany => Boolean(row)),
    input.org,
  );
  const match = fromList || tickerMatch || fromFiling;
  const tickerAccepted = Boolean(tickerMatch) && match === tickerMatch;
  const personLine = personOnFiling(groups, input.person, input.org);
  if (!input.tickersOk && flat.length === 0) {
    return {
      status: "UNAVAILABLE",
      corroborates: false,
      url: "https://www.sec.gov/edgar/search/",
      finding: "EDGAR was blocked, timed out, or did not respond. This source could not be checked.",
    };
  }
  if (!match) {
    const parent = shorterParentCandidate(input.companies, input.org) || partialEdgarCandidate(input.companies, input.org);
    if (parent) return parentMatchResult(parent, personNamedWithFirm(groups, input.person, parent.title));
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      url: "https://www.sec.gov/edgar/search/",
      finding: "EDGAR responded. No company on the SEC list uses this firm's name.",
    };
  }
  const titled = `${match.title}${match.ticker ? ` (${match.ticker})` : ""}`;
  if (input.identity && matchedNameIsFormer(input.org, match.title, input.identity)) {
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      reviewFlag: true,
      url: edgarCompanyUrl(match.cik),
      finding: `EDGAR's current name for CIK ${match.cik} is ${input.identity.currentName}. ${titled} is a former name. Needs review. A former name is not an exact match and does not corroborate.`,
    };
  }
  if (!sameFirmName(match.title, input.org) && !tickerAccepted) {
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      reviewFlag: true,
      url: edgarCompanyUrl(match.cik),
      finding: `EDGAR lists ${titled}, CIK ${match.cik}. A parent, affiliate, or different name is not an exact match for the company on the application. It is inconclusive and does not corroborate. This is not a pass.`,
    };
  }
  const ownerLine = tickerAccepted || sameFirmName(match.title, input.org) ? reportingOwnerLine(input.insiderNames || [], input.person) : "";
  const personSentence = personLine
    ? ` A filing names ${personLine.replace(/\s+/g, " ").trim()}.`
    : ownerLine
      ? ` A Form 3, 4, or 5 for this CIK names ${ownerLine} as a reporting owner.`
      : "";
  const personTied = Boolean(personLine || ownerLine);
  if (!personTied) {
    const tickerNote = tickerAccepted
      ? " The ticker matches the company name on the application, and the website domain stem is that ticker."
      : "";
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      companyOnly: true,
      url: edgarCompanyUrl(match.cik),
      finding: `EDGAR lists ${titled}, CIK ${match.cik}.${tickerNote} A name-only company match is inconclusive and does not corroborate. It does not tie the person to the firm.`,
    };
  }
  return {
    status: "PASS",
    corroborates: true,
    url: edgarCompanyUrl(match.cik),
    finding: `EDGAR lists ${titled}, CIK ${match.cik}. Confirm it is the same firm.${personSentence}`,
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
  website = "",
): Promise<Pick<CheckOutput, "status" | "finding" | "url" | "corroborates" | "reviewFlag" | "companyOnly">> {
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
  const listed = companies ? matchEdgarCompany(companies, org) || edgarTickerDomainMatch(companies, org, website) : null;
  const last = surnameForSearch(person);
  const distinctive = distinctiveCompanyTokens(org)[0] || org;
  const phrase = edgarCompanySearchPhrase(org);
  const personQuery = last ? `"${last}" "${distinctive}"` : "";
  const companyQuery = phrase ? `"${phrase}"` : "";
  const queries = [...new Set([personQuery, companyQuery].filter(Boolean))];
  const groups: string[][] = [];
  for (const query of queries) {
    const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(query)}&dateRange=custom&startdt=2015-01-01&enddt=2030-01-01`;
    const filing = await fetchImpl(searchUrl).catch(() => ({ ok: false, status: 0, text: "" }));
    if (filing.ok) groups.push(...(filingNames(filing.text) || []));
  }
  let identity: EdgarFilerIdentity | null = null;
  if (listed?.cik) {
    const submissions = await fetchImpl(submissionsUrl(listed.cik)).catch(() => ({ ok: false, status: 0, text: "" }));
    if (submissions.ok) identity = parseSubmissionsIdentity(submissions.text);
  }
  const insiderNames: string[][] = [];
  if (listed?.cik && last.length >= 3) {
    const forms = await Promise.all(
      ["3", "4", "5"].map(async (form) => {
        const searchUrl = insiderSearchUrl(last, listed.cik, form);
        return fetchImpl(searchUrl).catch(() => ({ ok: false, status: 0, text: "" }));
      }),
    );
    for (const filing of forms) {
      if (filing.ok) insiderNames.push(...(filingNames(filing.text) || []));
    }
  }
  return assessEdgarMatch({
    org,
    person,
    tickersOk: Boolean(companies),
    companies: companies || [],
    filingNames: groups,
    website,
    insiderNames,
    identity,
  });
}
