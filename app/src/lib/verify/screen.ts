import { classifyFetchError, decodeHtmlEntities } from "@/lib/verify/fetch";
import { registrableHost } from "@/lib/verify/host";
import type { ApplicantFacts, CheckOutput, EvidenceStatus } from "@/lib/verify/types";
import { cityPhrase, googleNewsUrl, instagramCompanyTag, judgeHeadline, newsSearchQueries, queryCity, socialSearchQuery } from "@/lib/verify/news";
import { stripQaOrg } from "@/lib/verify/qa-marker";
import { alternatePersonNames, brandAliases, distinctiveCompanyTokens, domainMatchesOrgStem, firmContainsApplicantName, formalGivenName, formalGivenNames, hostMatchesOrgLetters, leftTheCompany, linkedinCompanyMatchesOrg, linkedinProfileMatchesPerson, mentionsBrandAlias, mentionsCompany, orgLettersLabel, parsePersonName, personHit, surnameForSearch } from "@/lib/verify/public-match";
import { braveResultBlocks, gdeltResultTexts, isLinkedInDirectory, mojeekResultBlocks, wikidataSearchResultPages, wikipediaRestResultPages } from "@/lib/verify/web-search";

const COULD_NOT_CHECK = "Couldn't check for free.";
const SEARCH_RETRY_MS = 400;

export { distinctiveCompanyTokens };

const YOUTUBE_CHROME = new Set([
  "search filters",
  "keyboard shortcuts",
  "playback",
  "general",
  "subtitles and closed captions",
  "spherical videos",
]);

export type MatchConfidence = "high" | "medium" | "low" | "none";

export type MatchScore = {
  name: boolean;
  company: boolean;
  city: boolean;
  confidence: MatchConfidence;
  suffixMismatch?: boolean;
  departure?: boolean;
  /** A brand alias matched. The legal name did not. Review only. */
  alias?: string;
};

type FetchText = (
  url: string,
  init?: { userAgent?: string },
) => Promise<{ ok: boolean; status: number; text: string; url?: string; failure?: "nxdomain" | "timeout" | "network" }>;

type Attempt = {
  key: string;
  platform: string;
  searched: string;
  url: string;
  outcome: "found" | "not-found" | "blocked" | "missing" | "dead";
  score: MatchScore;
  detail: string;
  selfReported?: boolean;
  linkedUrl?: string;
  /** Other matched snippets. They can feed the footprint. They do not decide whether this hit is self-reported. */
  moreUrls?: string;
  /** Final URL after a redirect onto a different registrable host. www and the bare host are the same. */
  redirectedTo?: string;
  /** The landed brand is not the company on the application. Review only. It does not corroborate. */
  aliasOnly?: boolean;
  /** Set on screen-news so it uses the same headline judgement as the news check. */
  headlineKind?: "hard" | "civil" | "none";
  foreclosureOnly?: boolean;
};

const COMPANY_ONLY = "company confirmed, person NOT confirmed";

export function scorePublicText(
  text: string,
  facts: { name: string; org: string; location: string; aliases?: string[] },
  options?: { ownFirm?: boolean },
): MatchScore {
  const hay = text.toLowerCase();
  const hit = personHit(text, facts.name, facts.org, options?.ownFirm ? { ownFirm: true } : undefined);
  const suffixMismatch = hit === "suffix-mismatch";
  const name = hit === "match";
  const company = mentionsCompany(text, facts.org, facts.name);
  const alias = company ? "" : mentionsBrandAlias(text, facts.aliases || []);
  const departure = name && company && text.trim().length <= 500 && leftTheCompany(text, facts.org, facts.name);
  const currentName = name && !departure;
  const city = cityPhrase(facts.location).toLowerCase();
  const cityHit = city.length >= 4 && hay.includes(city);
  const surname = surnameForSearch(facts.name);
  const possessiveSurname = Boolean(
    !currentName &&
      company &&
      surname &&
      text.trim().length <= 240 &&
      new RegExp(`(?<![A-Za-z])${surname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['’]s\\b`, "i").test(text),
  );
  let confidence: MatchConfidence = "none";
  if (currentName && company) confidence = "high";
  else if ((currentName && cityHit) || (company && cityHit)) confidence = "medium";
  else if (currentName || company || suffixMismatch || alias || possessiveSurname) confidence = "low";
  return { name: currentName || possessiveSurname, company, city: cityHit, confidence, suffixMismatch, departure, alias: alias || undefined };
}

export function emptyScore(): MatchScore {
  return { name: false, company: false, city: false, confidence: "none" };
}

/** A YouTube, TikTok, or news hit counts only when the person is named with the company or the city. */
export function socialMatch(score: MatchScore): boolean {
  return Boolean(score.name && (score.company || score.city));
}

export function readableWordCount(text: string): number {
  return text.split(/\s+/).filter((word) => /[A-Za-z]{3,}/.test(word)).length;
}

/** A JavaScript shell with nothing to read. A short real page is not this. */
export function isScriptRenderedShell(raw: string, text: string): boolean {
  const words = readableWordCount(text);
  if (words >= 24) return false;
  const marker = /enable javascript|__next_data__|id=["']__next["']|id=["']root["']|data-reactroot|ng-version|<app-root\b/i.test(raw);
  if (marker) return true;
  return words < 8 && /<script\b/i.test(raw);
}

/** HTTP 200 can still be an Imperva or Cloudflare challenge. That is not page content. */
export function isBotChallenge(text: string): boolean {
  if (/_Incapsula_Resource|cf-chl|challenge-platform|<title>\s*Just a moment|Attention Required!\s*\|\s*Cloudflare|Access Denied[\s\S]{0,120}Reference\s*#|sgcaptcha|vercel security checkpoint|http-equiv=["']refresh["'][^>]*sgcaptcha/i.test(text)) {
    return true;
  }
  // A Next/React/Angular shell already has its own unreadability message.
  if (/enable javascript|__next_data__|id=["']__next["']|id=["']root["']|data-reactroot|ng-version|<app-root\b/i.test(text)) {
    return false;
  }
  const stripped = text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const scriptBlocks = text.match(/<script\b/gi) || [];
  return scriptBlocks.length > 0 && stripped.length < 200 && text.length > 40 && stripped.length * 4 < text.length;
}

/** A login wall or a bot challenge is a blocked source, not an empty result. */
export function accessBlocked(status: number, text: string, url = ""): boolean {
  if (status === 0 || status === 202 || status === 400 || status === 401 || status === 403 || status === 405 || status === 429 || status === 999 || status >= 500) {
    return true;
  }
  const blob = `${url} ${text.slice(0, 2500)}`.toLowerCase();
  if (/accounts\/login|\/i\/flow\/login|onboarding\/web|login\.php/.test(blob)) return true;
  if (/challenge-form|captcha/.test(blob) && !/result__a|b_algo/.test(text)) return true;
  return false;
}

export function linkedinBlocked(
  status: number,
  text: string,
  facts?: { name: string; org: string; location: string },
): boolean {
  if (status === 0 || status === 401 || status === 403 || status === 429 || status === 999 || status >= 500) return true;
  const low = text.toLowerCase();
  const wall = /authwall|join linkedin|sign in to linkedin|agree & join linkedin/.test(low);
  if (!wall) return false;
  if (!facts) return true;
  return scorePublicText(text, facts).confidence === "none";
}

function decodeYoutubeText(value: string): string {
  return value.replace(/\\u0026/g, "&").replace(/\\"/g, '"');
}

export function youtubeTitles(html: string): string[] {
  const titles = [...html.matchAll(/"title":\{"runs":\[\{"text":"([^"]{3,180})"/g)].map((match) => decodeYoutubeText(match[1]));
  return titles.filter((title) => !YOUTUBE_CHROME.has(title.toLowerCase()));
}

export function youtubeSnippets(html: string): string[] {
  const snippets: string[] = [];
  for (const match of html.matchAll(/"snippetText":\{"runs":\[([\s\S]*?)\]\}/g)) {
    const text = [...match[1].matchAll(/"text":"([^"]*)"/g)].map((item) => decodeYoutubeText(item[1])).join("").trim();
    if (text) snippets.push(text);
  }
  return snippets;
}

export function tiktokProfileText(html: string): string {
  const nickname = (html.match(/"nickname":"([^"]*)"/) || [])[1] || "";
  const uniqueId = (html.match(/"uniqueId":"([^"]*)"/) || [])[1] || "";
  const signature = (html.match(/"signature":"([^"]*)"/) || [])[1] || "";
  return [nickname, uniqueId, signature].filter(Boolean).join(" ");
}

const TEAM_PAGE = /about|contact|team|leader|leadership|people|executive|our-company|our-firm|our-story|our-team|who-we|professionals?|attorneys?|lawyers?|staff|\bbio\b/i;

/** A service page such as /asset-management is not a leadership page. /about/executive-management still is. */
function isServiceManagementSlug(pathname: string): boolean {
  return /(?:^|\/)[^/]*-management(?:\/|$)/i.test(pathname);
}

function isTeamLink(pathname: string, raw: string): boolean {
  if (isServiceManagementSlug(pathname) && !/leadership|about|team|people|executive|professionals|attorneys|lawyers|staff|\bbio\b/i.test(pathname)) {
    return false;
  }
  return TEAM_PAGE.test(`${pathname} ${raw}`);
}

function teamPriority(pathname: string): number {
  if (/leadership|executive/i.test(pathname)) return 0;
  if (/about/i.test(pathname)) return 1;
  if (/team|people|professional|attorney|lawyer|staff|\bbio\b/i.test(pathname)) return 2;
  return 3;
}

/** href attributes plus JSON url fields. Escaped slashes in script JSON are real paths. */
function rawHrefs(html: string): string[] {
  const source = html.replace(/\\\//g, "/").replace(/\\"/g, '"');
  const hrefs: string[] = [];
  for (const match of source.matchAll(/href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'=<>`]+))/gi)) {
    hrefs.push(match[1] || match[2] || match[3] || "");
  }
  for (const match of source.matchAll(/"(?:url|href|permalink|path)"\s*:\s*"([^"]+)"/gi)) {
    hrefs.push(match[1]);
  }
  return hrefs;
}

/** Probed when the nav did not already link them. A JavaScript menu still leaves these paths. */
export const TEAM_FALLBACK_PATHS = [
  "/professionals",
  "/attorneys",
  "/attorney",
  "/lawyers",
  "/our-people",
  "/associated_attorney",
  "/people",
  "/leadership",
  "/our-team",
  "/team",
  "/about",
  "/about/leadership",
  "/about/executive-management",
];

export function fallbackTeamUrls(base: string, already: string[]): string[] {
  let origin = "";
  try {
    origin = new URL(base).origin;
  } catch {
    return [];
  }
  const seen = new Set(already.map((url) => url.replace(/\/$/, "").toLowerCase()));
  const found: string[] = [];
  for (const path of TEAM_FALLBACK_PATHS) {
    const href = `${origin}${path}`;
    if (seen.has(href.toLowerCase())) continue;
    seen.add(href.toLowerCase());
    found.push(href);
  }
  return found;
}

export function sameOriginPages(html: string, base: string): string[] {
  let origin = "";
  try {
    origin = new URL(base).origin;
  } catch {
    return [];
  }
  const found: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawHrefs(html)) {
    let url: URL;
    try {
      url = new URL(raw, base);
    } catch {
      continue;
    }
    if (url.origin !== origin) continue;
    if (!isTeamLink(url.pathname, raw)) continue;
    url.hash = "";
    const href = url.toString();
    if (seen.has(href) || href === new URL(base).toString()) continue;
    seen.add(href);
    found.push(href);
  }
  return found
    .sort((left, right) => teamPriority(new URL(left).pathname) - teamPriority(new URL(right).pathname))
    .slice(0, 4);
}

function surnameNeedles(lastName: string): string[] {
  const full = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const last = (lastName.toLowerCase().split(/\s+/).pop() || "").replace(/[^a-z]/g, "");
  return [...new Set([full, last].filter((item) => item.length >= 3))];
}

function pathHasSurname(pathname: string, needles: string[]): boolean {
  const path = decodeURIComponent(pathname).toLowerCase().replace(/[^a-z]/g, "");
  return needles.some((needle) => path.includes(needle));
}

/** Up to eight sitemap URLs whose path contains the person's last name. Other sitemap paths are not fetched. */
export function sitemapPersonUrls(xml: string, origin: string, lastName: string): string[] {
  const needles = surnameNeedles(lastName);
  if (!needles.length) return [];
  let base: URL;
  try {
    base = new URL(origin);
  } catch {
    return [];
  }
  const found: string[] = [];
  const seen = new Set<string>();
  for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    let url: URL;
    try {
      url = new URL(match[1].trim(), base.origin);
    } catch {
      continue;
    }
    if (url.origin !== base.origin) continue;
    if (!pathHasSurname(url.pathname, needles)) continue;
    url.hash = "";
    const href = url.toString();
    if (seen.has(href)) continue;
    seen.add(href);
    found.push(href);
    if (found.length >= 8) break;
  }
  return found;
}

/** Same-origin links whose path contains the surname, including /our-people/partners/stephen-b-meister/. */
export function surnamePageUrls(html: string, base: string, lastName: string): string[] {
  const needles = surnameNeedles(lastName);
  if (!needles.length) return [];
  let origin = "";
  try {
    origin = new URL(base).origin;
  } catch {
    return [];
  }
  const found: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawHrefs(html)) {
    let url: URL;
    try {
      url = new URL(raw, base);
    } catch {
      continue;
    }
    if (url.origin !== origin) continue;
    if (!pathHasSurname(url.pathname, needles)) continue;
    url.hash = "";
    const href = url.toString();
    if (seen.has(href)) continue;
    seen.add(href);
    found.push(href);
    if (found.length >= 8) break;
  }
  return found;
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function sitemapLocs(xml: string, origin: string): string[] {
  let base: URL;
  try {
    base = new URL(origin);
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    try {
      const url = new URL(decodeXml(match[1]), base.origin);
      if (url.origin !== base.origin) continue;
      found.push(url.toString());
    } catch {
      continue;
    }
  }
  return found;
}

function looksLikePeopleSitemap(loc: string, needle: string): boolean {
  try {
    const url = new URL(loc);
    return /team|people|leader|leadership|professional|attorney|lawyer|staff|bio|about|our-team|our-people|associated|page-sitemap|(?:^|\/)page(?:\/|$)/i.test(url.pathname) || (needle.length >= 3 && decodeURIComponent(url.pathname).toLowerCase().includes(needle));
  } catch {
    return false;
  }
}

/** Homepage sitemap, or child sitemaps when the root file is an index. Capped at eight last-name URLs. */
export async function sitemapLastNameUrls(
  fetchText: FetchText,
  origin: string,
  lastName: string,
): Promise<string[]> {
  const root = await pull(fetchText, `${origin}/sitemap.xml`);
  if (root.status < 200 || root.status >= 400 || !root.text.includes("<loc")) return [];
  if (!/<sitemapindex\b/i.test(root.text)) return sitemapPersonUrls(root.text, origin, lastName);
  const needle = surnameNeedles(lastName).pop() || "";
  const children = sitemapLocs(root.text, origin);
  const named = children.filter((loc) => looksLikePeopleSitemap(loc, needle)).slice(0, 4);
  // A Liferay index uses sitemap.xml?p_l_id=… with no "people" in the path. Scan a few of those
  // until the surname shows up, and stop so one company does not download the whole index.
  const queue = named.length ? named : children.slice(0, 8);
  const found: string[] = [];
  for (const child of queue) {
    const page = await pull(fetchText, child);
    if (page.status >= 200 && page.status < 400) found.push(...sitemapPersonUrls(page.text, origin, lastName));
    if (named.length) {
      if (found.length >= 8) break;
    } else if (found.length) {
      break;
    }
  }
  return [...new Set(found)].slice(0, 8);
}

export function applicantHost(website: string): string {
  try {
    return new URL(website).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function socialLinksFrom(html: string): { platform: string; url: string }[] {
  const patterns: { platform: string; re: RegExp }[] = [
    { platform: "LinkedIn", re: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-z0-9\-_%&.]+\/?/gi },
    { platform: "X", re: /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[a-z0-9_]+\/?/gi },
    { platform: "Facebook", re: /https?:\/\/(?:www\.)?facebook\.com\/(?:people\/[a-z0-9.\-]+\/\d+|[a-z0-9.\-]+)\/?/gi },
    { platform: "Instagram", re: /https?:\/\/(?:www\.)?instagram\.com\/[a-z0-9._]+\/?/gi },
    { platform: "YouTube", re: /https?:\/\/(?:www\.)?youtube\.com\/(?:@[a-z0-9_\-]+|channel\/[a-z0-9_\-]+|c\/[a-z0-9_\-]+)/gi },
    { platform: "TikTok", re: /https?:\/\/(?:www\.)?tiktok\.com\/@[a-z0-9._]+\/?/gi },
  ];
  const out: { platform: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern.re)) {
      const url = match[0].replace(/^http:\/\//i, "https://");
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({ platform: pattern.platform, url });
    }
  }
  return out;
}

export function serpUnusable(snippets: string[], facts: { name: string; org: string; location: string }): boolean {
  if (!snippets.length) return false;
  return !snippets.some((snippet) => {
    const score = scorePublicText(snippet, facts);
    return score.name || score.company;
  });
}

function strong(score: MatchScore): boolean {
  return score.confidence === "high" || (score.confidence === "medium" && score.name);
}

/** http://www.linkedin.com/company/6346 is requested as https, then the named company page. */
export function linkedinCompanyFollow(url: string, html: string): string {
  const secure = url.replace(/^http:\/\//i, "https://");
  if (!/\/company\/\d+\/?$/i.test(secure)) return secure;
  const canonical = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-z][a-z0-9\-_%&.]+/i)?.[0] || "";
  if (!canonical || /\/company\/\d+\/?$/i.test(canonical)) return secure;
  return canonical.replace(/^http:\/\//i, "https://");
}

function findingFor(attempt: Attempt): { status: EvidenceStatus; finding: string; corroborates: boolean; companyOnly?: boolean; reviewFlag?: boolean } {
  const socialMiss = (attempt.key === "screen-youtube" || attempt.key === "screen-tiktok") && !attempt.score.name && attempt.outcome === "not-found";
  const companyWord = socialMiss
    ? "no"
    : attempt.score.alias && !attempt.score.company
      ? `alias (${attempt.score.alias})`
      : attempt.score.company
        ? "yes"
        : "no";
  const scoreLine = `Name: ${attempt.score.name ? "yes" : "no"}. Company: ${companyWord}. City: ${attempt.score.city ? "yes" : "no"}. Confidence: ${socialMiss ? "none" : attempt.score.confidence}.`;
  if (attempt.outcome === "dead") {
    return {
      status: "FAIL",
      corroborates: false,
      finding: `Searched: ${attempt.searched}. domain does not resolve.`.replace(/\s+/g, " ").trim(),
    };
  }
  if (attempt.outcome === "missing") {
    return {
      status: "NOT_RUN",
      corroborates: false,
      finding: `Searched: ${attempt.searched}. ${attempt.detail} The website is missing, not provided. It was not blocked.`.replace(/\s+/g, " ").trim(),
    };
  }
  if (attempt.outcome === "blocked") {
    return {
      status: "UNAVAILABLE",
      corroborates: false,
      finding: `Searched: ${attempt.searched}. ${attempt.detail} ${COULD_NOT_CHECK} Not checkable for free.`.replace(/\s+/g, " ").trim(),
    };
  }
  const redirectNote = attempt.redirectedTo ? `The site redirected to ${attempt.redirectedTo}.` : "";
  if (attempt.outcome === "not-found") {
    const lead = /Tried /.test(attempt.detail) || /same source as /.test(attempt.detail)
      ? attempt.detail
      : attempt.detail === "no match found"
        ? "no match found"
        : "No result found that names this person and this company.";
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      finding: `Searched: ${attempt.searched}. ${redirectNote} ${lead} ${scoreLine}`.replace(/\s+/g, " ").trim(),
    };
  }
  if (attempt.score.suffixMismatch) {
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      reviewFlag: true,
      finding: `Searched: ${attempt.searched}. A different generational suffix is on this page, so the name did not match. ${scoreLine}`.replace(/\s+/g, " ").trim(),
    };
  }
  if (attempt.score.departure) {
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      reviewFlag: true,
      finding: `Searched: ${attempt.searched}. ${redirectNote} This may no longer be at the company on the application. The page reads as an announced departure. ${attempt.detail} ${scoreLine}`.replace(/\s+/g, " ").trim(),
    };
  }
  if (attempt.aliasOnly || (attempt.score.alias && !attempt.score.company)) {
    const brand = attempt.score.alias || "alias";
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      reviewFlag: true,
      finding: `Searched: ${attempt.searched}. ${redirectNote} The page uses the brand ${brand} and not the legal name. The new brand is a review-only alias and does not corroborate the company on the application. Needs review. An alias hit is not corroboration. ${scoreLine}`.replace(/\s+/g, " ").trim(),
    };
  }
  // Name plus city is not a person-to-company link. "Larry Silverstein" in New York does not corroborate Toll Brothers.
  const tied = attempt.score.name && attempt.score.company && strong(attempt.score);
  const linkedinCompanyPage = attempt.key === "linkedin-fetch" && /linkedin\.com\/company\//i.test(attempt.url);
  const companyOnlyPage = (attempt.key === "website" || linkedinCompanyPage) && attempt.score.company && !attempt.score.name;
  if (companyOnlyPage) {
    return {
      status: "PASS",
      corroborates: false,
      companyOnly: true,
      finding: `Searched: ${attempt.searched}. ${redirectNote} Found: ${attempt.detail} ${COMPANY_ONLY}. That is company-exists evidence, not a person-to-company link. ${scoreLine}`.replace(/\s+/g, " ").trim(),
    };
  }
  if (attempt.key === "screen-news" && attempt.headlineKind && attempt.headlineKind !== "none") {
    const companyLevel = attempt.foreclosureOnly || ((attempt.headlineKind === "civil" || attempt.headlineKind === "hard") && !attempt.score.name);
    if (companyLevel) {
      const label = attempt.headlineKind === "hard" ? "Company-level crime headline." : "Company-level litigation headline.";
      return {
        status: "INCONCLUSIVE",
        corroborates: false,
        finding: `Searched: ${attempt.searched}. ${label} ${attempt.detail} ${scoreLine}`.replace(/\s+/g, " ").trim(),
      };
    }
    return {
      status: "FAIL",
      corroborates: false,
      reviewFlag: true,
      finding: `Searched: ${attempt.searched}. ${attempt.detail} ${scoreLine}`.replace(/\s+/g, " ").trim(),
    };
  }
  if (attempt.score.name && !attempt.score.company && attempt.score.city) {
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      reviewFlag: true,
      finding: `Searched: ${attempt.searched}. ${redirectNote} name found, company not named. ${attempt.detail} ${scoreLine}`.replace(/\s+/g, " ").trim(),
    };
  }
  const selfReportedNote = attempt.selfReported
    ? " Self-reported page. Together with a footprint from the same site, this is one applicant-supplied source. It does not by itself corroborate the person."
    : "";
  return {
    status: tied ? "PASS" : "INCONCLUSIVE",
    corroborates: tied && !attempt.selfReported,
    finding: `Searched: ${attempt.searched}. ${redirectNote} Found: ${attempt.detail}${selfReportedNote} ${scoreLine}`.replace(/\s+/g, " ").trim(),
  };
}

/** The result page itself is on the applicant's domain. A mention of that domain in the snippet is not enough. */
export function hostIsApplicant(href: string, ownHost: string): boolean {
  if (!ownHost || !/^https?:\/\//i.test(href)) return false;
  let host = "";
  try {
    host = new URL(href).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return false;
  }
  const own = ownHost.replace(/^www\./, "").toLowerCase();
  return host === own || host.endsWith(`.${own}`);
}

function resultPageOnOwnSite(attempt: Attempt, ownHost: string): boolean {
  if (!ownHost) return false;
  // One hit, one host. The result link decides. A later snippet, or a domain mentioned beside that link, does not.
  const linked = (attempt.linkedUrl || "").split(/\s+/).filter((href) => /^https?:\/\//i.test(href));
  if (linked.length) return hostIsApplicant(linked[0], ownHost);
  return hostIsApplicant(attempt.url, ownHost);
}

function toCheck(attempt: Attempt, ownHost = ""): CheckOutput {
  const ownSite = Boolean(attempt.selfReported) || attempt.key === "website" || resultPageOnOwnSite(attempt, ownHost);
  const judged = findingFor({ ...attempt, selfReported: ownSite || attempt.selfReported });
  return {
    key: attempt.key,
    status: judged.status,
    weight: judged.corroborates && !ownSite ? 8 : 4,
    finding: judged.finding,
    source: attempt.platform,
    url: attempt.url,
    ranAt: new Date().toISOString(),
    reviewFlag: judged.reviewFlag || undefined,
    corroborates: attempt.key === "screen-news" ? false : judged.corroborates && !ownSite && !judged.companyOnly,
    selfReported: ownSite ? true : undefined,
    companyOnly: judged.companyOnly || undefined,
  };
}

function blockedAttempt(key: string, platform: string, searched: string, url: string, detail: string): Attempt {
  return { key, platform, searched, url, outcome: "blocked", score: emptyScore(), detail };
}

async function pull(
  fetchText: FetchText,
  url: string,
  init?: { userAgent?: string },
): Promise<{ ok: boolean; status: number; text: string; url?: string; failure?: "nxdomain" | "timeout" | "network" }> {
  try {
    return await fetchText(url, init);
  } catch (error) {
    return { ok: false, status: 0, text: "", failure: classifyFetchError(error) };
  }
}

/** One search engine cannot hold the rest. A hang becomes a timed-out source, not a dropped step. */
export const SEARCH_SOURCE_MS = 7000;

async function pullWithin(
  fetchText: FetchText,
  url: string,
  ms = SEARCH_SOURCE_MS,
): Promise<{ ok: boolean; status: number; text: string; url?: string; failure?: "nxdomain" | "timeout" | "network" }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      pull(fetchText, url),
      new Promise<{ ok: false; status: 0; text: ""; failure: "timeout" }>((resolve) => {
        timer = setTimeout(() => resolve({ ok: false, status: 0, text: "", failure: "timeout" }), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Any redirect that changes the host or the path. www and the bare host are the same site. */
function finalLanding(requested: string, response: { url?: string }): string {
  const landed = response.url?.trim() || "";
  if (!landed) return "";
  try {
    const from = new URL(requested);
    const to = new URL(landed);
    const hostOf = (host: string) => host.replace(/^www\./, "").toLowerCase();
    const sameHost = hostOf(from.hostname) === hostOf(to.hostname);
    const samePath = from.pathname.replace(/\/$/, "") === to.pathname.replace(/\/$/, "");
    if (sameHost && samePath) return "";
    return landed;
  } catch {
    return "";
  }
}

/** A redirect onto a different registrable host. www and the bare host are the same site. */
function crossDomainLanding(requested: string, response: { url?: string }): string {
  const landed = response.url?.trim() || "";
  if (!landed) return "";
  try {
    const from = registrableHost(new URL(requested).host);
    const to = registrableHost(new URL(landed).host);
    if (!from || !to || from === to) return "";
    return landed;
  } catch {
    return "";
  }
}

function hostLabel(url: string): string {
  try {
    return registrableHost(new URL(url).host).split(".")[0].replace(/[^a-z0-9]/g, "");
  } catch {
    return "";
  }
}

function decodeBingCk(value: string): string {
  const payload = value.replace(/^a1/i, "").replace(/-/g, "+").replace(/_/g, "/");
  try {
    const decoded = globalThis.atob(payload);
    return /^https?:\/\//i.test(decoded) ? decoded : "";
  } catch {
    return "";
  }
}

function unwrapResultUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed.startsWith("//") ? `https:${trimmed}` : trimmed);
    const inner = url.searchParams.get("uddg");
    if (inner) return inner;
    const host = url.hostname.toLowerCase();
    if (host.endsWith("bing.com") && url.pathname.startsWith("/ck/")) return decodeBingCk(url.searchParams.get("u") || "");
    if (host.includes("duckduckgo.com") && url.pathname.startsWith("/l/")) return "";
    return url.toString();
  } catch {
    return trimmed;
  }
}

/** Host and path, without www or a trailing slash, so the same page is not counted twice. */
function canonicalPage(value: string): string {
  try {
    const url = new URL(unwrapResultUrl(value));
    url.hash = "";
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const path = url.pathname.replace(/\/$/, "") || "/";
    return `${host}${path}`;
  } catch {
    return value.trim().toLowerCase();
  }
}

function rssHeadlines(xml: string): { title: string; url: string }[] {
  const items: { title: string; url: string }[] = [];
  for (const block of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const chunk = block[0];
    const title = (chunk.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "")
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/&amp;/g, "&")
      .trim();
    const link = (chunk.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    if (title) items.push({ title, url: link });
  }
  return items.slice(0, 15);
}

function headlineImportance(judged: {
  kind: "hard" | "civil" | "none";
  person: boolean;
  company: boolean;
  location: boolean;
  foreclosureOnly: boolean;
}): number {
  if (judged.kind === "hard" && judged.person && (judged.company || judged.location)) return 0;
  if (judged.kind === "hard" && !judged.person && judged.company) return 1;
  if (judged.kind === "civil" && judged.person && (judged.company || judged.location) && !judged.foreclosureOnly) return 2;
  if (judged.kind === "none" && judged.person && judged.company) return 3;
  if (judged.foreclosureOnly && judged.company) return 4;
  if (judged.kind === "civil" && !judged.person && judged.company) return 4;
  return 5;
}

function snippetFrom(html: string): { text: string; hrefs: string[] } {
  const hrefs = [...html.matchAll(/href\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)]
    .map((match) => unwrapResultUrl(match[1] || match[2] || ""))
    .filter((href) => /^https?:\/\//i.test(href));
  return { text: visible(html), hrefs };
}

function visible(html: string): string {
  const withoutAttrs = html.replace(
    /^(?:\s*(?:class|id|href|title|target|rel|data-[\w-]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))+\s*>?/,
    " ",
  );
  return decodeHtmlEntities(
    withoutAttrs
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function withWww(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.host.startsWith("www.")) return url;
    parsed.host = `www.${parsed.host}`;
    return parsed.toString();
  } catch {
    return url;
  }
}

/** A blocked homepage can still publish a readable sitemap. Open a surname page from it when one exists. */
async function personPageFromSitemap(
  fetchText: FetchText,
  pageUrl: string,
  person: string,
  queryFacts: { name: string; org: string; location: string },
): Promise<{ url: string; score: MatchScore } | null> {
  let origin = "";
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    return null;
  }
  const lastName = surnameForSearch(person);
  if (!lastName) return null;
  const urls = await sitemapLastNameUrls(fetchText, origin, lastName);
  let best: { url: string; score: MatchScore } | null = null;
  for (const url of urls.slice(0, 4)) {
    const page = await pull(fetchText, url);
    if (page.status < 200 || page.status >= 400 || isBotChallenge(page.text)) continue;
    const score = scorePublicText(visible(page.text), queryFacts, { ownFirm: true });
    if (!score.name) continue;
    if (!best || rank(score) > rank(best.score)) best = { url, score };
  }
  return best;
}

export const PUBLIC_SCREEN_KEYS = [
  "website",
  "linkedin-fetch",
  "screen-x",
  "screen-facebook",
  "screen-instagram",
  "screen-youtube",
  "screen-tiktok",
  "screen-news",
  "screen-web",
  "web-footprint",
] as const;

const SCREEN_SOURCE: Record<(typeof PUBLIC_SCREEN_KEYS)[number], string> = {
  website: "Company website",
  "linkedin-fetch": "LinkedIn",
  "screen-x": "X",
  "screen-facebook": "Facebook",
  "screen-instagram": "Instagram",
  "screen-youtube": "YouTube",
  "screen-tiktok": "TikTok",
  "screen-news": "Google News",
  "screen-web": "Web search",
  "web-footprint": "Web search",
};

/** A screen row that never finished is unavailable. A row that already finished stays as it was. */
export function completeScreenRows(present: CheckOutput[]): CheckOutput[] {
  const have = new Set(present.map((row) => row.key));
  const dropped = PUBLIC_SCREEN_KEYS.filter((key) => !have.has(key)).map((key) => ({
    key,
    status: "UNAVAILABLE" as const,
    weight: 0,
    finding: "Couldn't check. This check timed out or was dropped before it finished.",
    source: SCREEN_SOURCE[key],
    url: "",
    ranAt: new Date().toISOString(),
    corroborates: false,
  }));
  return [...present, ...dropped];
}

function onOwnRegistrable(href: string, website: string): boolean {
  try {
    const page = registrableHost(new URL(href).hostname);
    const own = registrableHost(new URL(website).hostname);
    return Boolean(page) && page === own;
  } catch {
    return false;
  }
}

function ownSiteResultRows(html: string): { href: string; text: string }[] {
  const bing = [...html.matchAll(/<li[^>]*class="[^"]*b_algo[^"]*"[\s\S]*?<\/li>/gi)].map((block) => ({
    href: unwrapResultUrl(block[0].match(/href\s*=\s*"([^"]+)"/i)?.[1] || ""),
    text: visible(block[0]),
  }));
  if (bing.length) return bing.filter((row) => row.href);
  const liteRows = [...html.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((row) => row[0]);
  const lite: { href: string; text: string }[] = [];
  for (let index = 0; index < liteRows.length; index += 1) {
    const link = /<a\b[^>]*class="[^"]*result-link[^"]*"[^>]*href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(liteRows[index] || "");
    if (!link) continue;
    const snippet = /class="[^"]*result-snippet[^"]*"[^>]*>([\s\S]*?)<\/t[dr]/i.exec(liteRows[index + 1] || "")?.[1] || "";
    const href = unwrapResultUrl(link[1] || "");
    if (href) lite.push({ href, text: visible(`${link[2]} ${snippet}`) });
  }
  if (lite.length) return lite;
  const anchors = [...html.matchAll(/<a\b[^>]*class="[^"]*result__(?:a|snippet)[^"]*"[^>]*>[\s\S]*?<\/a>/gi)].map((block) => block[0]);
  const htmlRows: { href: string; text: string }[] = [];
  for (let index = 0; index < anchors.length; index += 1) {
    if (!/result__a/i.test(anchors[index] || "")) continue;
    const href = unwrapResultUrl(anchors[index]?.match(/href\s*=\s*"([^"]+)"/i)?.[1] || "");
    const snippet = anchors[index + 1] && /result__snippet/i.test(anchors[index + 1] || "") ? anchors[index + 1] : "";
    if (href) htmlRows.push({ href, text: visible(`${anchors[index]} ${snippet}`) });
  }
  return htmlRows;
}

/** One site:domain search per name, at most two names. A lookalike host does not count. A page that ignores site: is not an answer. */
async function searchOwnSitePerson(
  fetchText: FetchText,
  website: string,
  person: string,
): Promise<{ kind: "hit"; url: string } | { kind: "empty" } | { kind: "down" }> {
  let domain = "";
  try {
    domain = registrableHost(new URL(website).hostname);
  } catch {
    return { kind: "down" };
  }
  if (!domain) return { kind: "down" };
  const parsed = parsePersonName(person);
  const surname = parsed?.surname || "";
  const typed = parsed?.given[0] || "";
  const formals = formalGivenNames(person);
  const givens = [...new Set(formals.length ? [...formals, typed] : [typed])].filter(Boolean).slice(0, 2);
  if (!givens.length || !surname) return { kind: "down" };
  let sawEmpty = false;
  for (const given of givens) {
    const query = `site:${domain} "${given} ${surname}"`;
    const targets = [
      `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    ];
    for (const url of targets) {
      let response = await pull(fetchText, url);
      if (url.includes("lite.duckduckgo.com") && response.status === 202) {
        await new Promise((resolve) => setTimeout(resolve, SEARCH_RETRY_MS));
        response = await pull(fetchText, url);
      }
      if (response.status < 200 || response.status >= 300 || response.status === 202 || isBotChallenge(response.text)) continue;
      const rows = ownSiteResultRows(response.text);
      if (!rows.length) {
        sawEmpty = true;
        continue;
      }
      const own = rows.filter((row) => onOwnRegistrable(row.href, website));
      if (!own.length) continue;
      sawEmpty = true;
      const named = own.find((row) => personHit(row.text, person) === "match");
      if (named) return { kind: "hit", url: named.href };
    }
  }
  return sawEmpty ? { kind: "empty" } : { kind: "down" };
}

export async function runPublicScreen(facts: ApplicantFacts, fetchText: FetchText, sink?: CheckOutput[]): Promise<CheckOutput[]> {
  const person = facts.applicantName || facts.name;
  const searchOrg = stripQaOrg(facts.org || "");
  let queryFacts: { name: string; org: string; location: string; aliases: string[] } = {
    name: person,
    org: searchOrg,
    location: facts.location,
    aliases: brandAliases(searchOrg, facts.website || ""),
  };
  const place = queryCity(facts.location);
  const searched = [person, searchOrg, place].filter(Boolean).map((part) => `"${part}"`).join(" ");
  const attempts: Attempt[] = [];
  const produced: CheckOutput[] = [];
  let flushed = 0;

  let website = facts.website.trim();
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  const ownHost = applicantHost(website);
  const webSearchPromise = startWebSearch();
  const flush = () => {
    while (flushed < attempts.length) {
      const row = toCheck(attempts[flushed], ownHost);
      produced.push(row);
      sink?.push(row);
      flushed += 1;
    }
  };
  const pages: { url: string; text: string; raw: string }[] = [];
  if (!website) {
    const letters = orgLettersLabel(searchOrg);
    const guess = letters.length >= 4 && letters.length <= 48 ? `https://www.${letters}.com` : "";
    let discovered = false;
    if (guess && hostMatchesOrgLetters(new URL(guess).hostname, searchOrg)) {
      const home = await pull(fetchText, guess);
      if (home.status >= 200 && home.status < 400 && !isBotChallenge(home.text)) {
        const score = scorePublicText(visible(home.text), { ...queryFacts, org: searchOrg }, { ownFirm: true });
        if (score.name && score.company) {
          discovered = true;
          attempts.push({
            key: "website",
            platform: "Company website",
            searched: "no website was on the application",
            url: guess,
            outcome: "found",
            score,
            detail: "Discovered company site (not on the application)",
            selfReported: true,
          });
        }
      }
    }
    if (!discovered) {
      attempts.push({
        key: "website",
        platform: "Company website",
        searched: "the website field on the application",
        url: "",
        outcome: "missing",
        score: emptyScore(),
        detail: "No company website was on the application.",
        selfReported: true,
      });
    }
  } else {
    let home = await pull(fetchText, website);
    if (home.status === 403) {
      await new Promise((resolve) => setTimeout(resolve, SEARCH_RETRY_MS));
      const again = await pull(fetchText, website);
      if (again.status !== 403) home = again;
    }
    let homeUrl = website;
    if (home.status === 0 && home.failure !== "nxdomain") {
      const alt = withWww(website);
      if (alt !== website) {
        home = await pull(fetchText, alt);
        homeUrl = alt;
      }
    }
    if (home.failure === "nxdomain") {
      attempts.push({
        key: "website",
        platform: "Company website",
        searched: website,
        url: homeUrl,
        outcome: "dead",
        score: emptyScore(),
        detail: "domain does not resolve",
        selfReported: true,
      });
    } else if (accessBlocked(home.status, home.text, homeUrl) && home.status !== 404) {
      const blockedBySite = home.status === 202 || home.status === 401 || home.status === 403 || home.status === 405 || home.status === 999;
      const crossDomain = crossDomainLanding(homeUrl, home);
      const redirectedTo = finalLanding(homeUrl, home) || crossDomain;
      let renamed = "";
      if (redirectedTo) {
        renamed = ` The site redirected to ${redirectedTo}.`;
        if (crossDomain) {
          let domain = redirectedTo;
          try {
            domain = new URL(redirectedTo).hostname.replace(/^www\./, "");
          } catch {
            domain = redirectedTo;
          }
          renamed += ` The new domain is ${domain}. The new brand is a review-only alias and does not corroborate the company on the application.`;
        }
      }
      const rescued = renamed
        ? null
        : await personPageFromSitemap(fetchText, homeUrl, person, queryFacts);
      if (rescued) {
        attempts.push({
          key: "website",
          platform: "Company website",
          searched: website,
          url: rescued.url,
          outcome: "found",
          score: rescued.score,
          detail: "a page on the company site",
          selfReported: true,
        });
      } else if (/sgcaptcha|vercel security checkpoint/i.test(home.text)) {
        attempts.push(
          blockedAttempt(
            "website",
            "Company website",
            website,
            homeUrl,
            "the site blocked automated access (bot challenge). blocked by a bot challenge",
          ),
        );
      } else if (!renamed && blockedBySite) {
        const found = await searchOwnSitePerson(fetchText, website, person);
        if (found.kind === "hit") {
          attempts.push({
            key: "website",
            platform: "Company website",
            searched: website,
            url: found.url,
            outcome: "found",
            score: { name: true, company: true, city: false, confidence: "high" },
            detail: "Own-site page found by search (the site blocked a direct fetch)",
            selfReported: true,
          });
        } else if (found.kind === "empty") {
          attempts.push({
            key: "website",
            platform: "Company website",
            searched: website,
            url: homeUrl,
            outcome: "not-found",
            score: emptyScore(),
            detail: "Own-site search returned no page naming this person.",
            selfReported: true,
          });
        } else {
          const blocked =
            home.status === 403
              ? "blocked the check (403). blocked by site (403) — not checkable for free; ask applicant for a team-page URL"
              : home.status === 405
                ? "blocked the check (405). blocked by site, ask applicant for a team-page URL"
                : "blocked by site, ask applicant for a team-page URL";
          attempts.push(
            blockedAttempt(
              "website",
              "Company website",
              website,
              redirectedTo || homeUrl,
              `${blocked}. Own-site search did not complete; site blocked a direct fetch.${renamed}`,
            ),
          );
        }
      } else {
        const detail =
          home.status === 403
            ? `blocked the check (403). blocked by site (403) — not checkable for free; ask applicant for a team-page URL${renamed}`
            : home.status === 405
              ? `blocked the check (405). blocked by site, ask applicant for a team-page URL${renamed}`
              : blockedBySite
                ? `blocked by site, ask applicant for a team-page URL${renamed}`
                : `The company website did not respond.${renamed}`;
        attempts.push(blockedAttempt("website", "Company website", website, redirectedTo || homeUrl, detail));
      }
    } else {
      const crossDomain = crossDomainLanding(homeUrl, home);
      const redirectedTo = finalLanding(homeUrl, home) || crossDomain;
      if (redirectedTo) homeUrl = redirectedTo;
      const homeChallenge = isBotChallenge(home.text);
      if (!homeChallenge) pages.push({ url: homeUrl, text: visible(home.text), raw: home.text });
      const linked = sameOriginPages(home.text, homeUrl);
      const fallback = fallbackTeamUrls(homeUrl, linked);
      let fromSitemap: string[] = [];
      let lastName = "";
      try {
        const origin = new URL(homeUrl).origin;
        lastName = surnameForSearch(person);
        fromSitemap = await sitemapLastNameUrls(fetchText, origin, lastName);
      } catch {
        fromSitemap = [];
      }
      const extra = [...new Set([...linked, ...fallback, ...fromSitemap])];
      const more = await Promise.all(extra.map(async (url) => ({ url, response: await pull(fetchText, url) })));
      const seenPages = new Set<string>();
      const remember = (url: string) => {
        seenPages.add(url.replace(/\/$/, ""));
      };
      remember(homeUrl);
      for (const page of more) {
        remember(page.url);
        if (page.response.status >= 200 && page.response.status < 400 && !isBotChallenge(page.response.text)) {
          pages.push({ url: page.url, text: visible(page.response.text), raw: page.response.text });
        }
      }
      if (lastName) {
        const hops: string[] = [];
        const sources = [
          ...(homeChallenge ? [] : [{ url: homeUrl, raw: home.text }]),
          ...more
            .filter((page) => page.response.status >= 200 && page.response.status < 400 && !isBotChallenge(page.response.text))
            .map((page) => ({ url: page.url, raw: page.response.text })),
        ];
        for (const source of sources) {
          for (const href of surnamePageUrls(source.raw, source.url, lastName)) {
            const key = href.replace(/\/$/, "");
            if (seenPages.has(key)) continue;
            seenPages.add(key);
            hops.push(href);
            if (hops.length >= 4) break;
          }
          if (hops.length >= 4) break;
        }
        if (hops.length) {
          const hopped = await Promise.all(hops.map(async (url) => ({ url, response: await pull(fetchText, url) })));
          for (const page of hopped) {
            if (page.response.status >= 200 && page.response.status < 400 && !isBotChallenge(page.response.text)) {
              pages.push({ url: page.url, text: visible(page.response.text), raw: page.response.text });
            }
          }
        }
      }
      queryFacts = { ...queryFacts, aliases: brandAliases(searchOrg, website || homeUrl, pages.map((page) => page.raw).join("\n")) };
      const best = pages
        .map((page) => ({ ...page, score: scorePublicText(page.text, queryFacts, { ownFirm: true }) }))
        .sort((left, right) => rank(right.score) - rank(left.score))[0];
      const label = crossDomain ? hostLabel(crossDomain) : "";
      const mentionsOriginal = pages.some((page) => mentionsCompany(page.text, searchOrg, person));
      const compact = pages.map((page) => page.text).join(" ").toLowerCase().replace(/[^a-z0-9]/g, "");
      const brand = mentionsBrandAlias(pages.map((page) => `${page.text}\n${page.raw}`).join("\n"), queryFacts.aliases);
      const labelIsThisFirm = Boolean(label && domainMatchesOrgStem(label, searchOrg));
      const aliasOnly = Boolean(
        !labelIsThisFirm && ((crossDomain && !mentionsOriginal && label.length >= 4 && compact.includes(label)) || (brand && !mentionsOriginal)),
      );
      if (!pages.length && homeChallenge) {
        attempts.push(
          blockedAttempt(
            "website",
            "Company website",
            website,
            homeUrl,
            "The company website served a bot challenge.",
          ),
        );
      } else if (pages.length && pages.every((page) => isScriptRenderedShell(page.raw, page.text))) {
        attempts.push(
          blockedAttempt(
            "website",
            "Company website",
            website,
            homeUrl,
            "site is script-rendered; nothing readable",
          ),
        );
      } else if (aliasOnly) {
        const score = best?.score || emptyScore();
        attempts.push({
          key: "website",
          platform: "Company website",
          searched: website,
          url: redirectedTo || best?.url || homeUrl,
          outcome: "found",
          score: { ...score, alias: score.alias || brand || undefined },
          detail: "a page on the company site",
          selfReported: true,
          redirectedTo,
          aliasOnly: true,
        });
      } else if (best && !best.score.name) {
        const found = await searchOwnSitePerson(fetchText, website, person);
        if (found.kind === "hit") {
          attempts.push({
            key: "website",
            platform: "Company website",
            searched: website,
            url: found.url,
            outcome: "found",
            score: { name: true, company: true, city: false, confidence: "high" },
            detail: "Own-site page found by search",
            selfReported: true,
            redirectedTo,
          });
        } else if (best.score.confidence !== "none" && !(best.score.alias && !best.score.company)) {
          attempts.push({
            key: "website",
            platform: "Company website",
            searched: website,
            url: best.url,
            outcome: "found",
            score: best.score,
            detail: "a page on the company site",
            selfReported: true,
            redirectedTo,
          });
        } else {
          attempts.push({
            key: "website",
            platform: "Company website",
            searched: website,
            url: homeUrl,
            outcome: "not-found",
            score: best.score,
            detail: "the company site responded",
            selfReported: true,
            redirectedTo,
          });
        }
      } else if (best && best.score.confidence !== "none" && !(best.score.alias && !best.score.company)) {
        attempts.push({
          key: "website",
          platform: "Company website",
          searched: website,
          url: best.url,
          outcome: "found",
          score: best.score,
          detail: "a page on the company site",
          selfReported: true,
          redirectedTo,
        });
      } else if (!best?.score.name) {
        const found = await searchOwnSitePerson(fetchText, website, person);
        if (found.kind === "hit") {
          attempts.push({
            key: "website",
            platform: "Company website",
            searched: website,
            url: found.url,
            outcome: "found",
            score: { name: true, company: true, city: false, confidence: "high" },
            detail: "Own-site page found by search",
            selfReported: true,
            redirectedTo,
          });
        } else {
          attempts.push({
            key: "website",
            platform: "Company website",
            searched: website,
            url: homeUrl,
            outcome: "not-found",
            score: best?.score || emptyScore(),
            detail: "the company site responded",
            selfReported: true,
            redirectedTo,
          });
        }
      } else {
        attempts.push({
          key: "website",
          platform: "Company website",
          searched: website,
          url: homeUrl,
          outcome: "not-found",
          score: best?.score || emptyScore(),
          detail: "the company site responded",
          selfReported: true,
          redirectedTo,
        });
      }
    }
  }
  flush();

  const socials = socialLinksFrom(pages.map((page) => page.raw).join("\n"));

  const typedLinkedin = facts.linkedinUrl.trim();
  const discoveredLinkedin =
    socials.find((item) => {
      if (item.platform !== "LinkedIn") return false;
      if (/linkedin\.com\/company\//i.test(item.url)) {
        const slug = decodeURIComponent(item.url.match(/linkedin\.com\/company\/([^/?#]+)/i)?.[1] || "");
        if (/^\d+$/.test(slug)) return true;
        return linkedinCompanyMatchesOrg(item.url, searchOrg);
      }
      return linkedinProfileMatchesPerson(item.url, person);
    })?.url || "";
  const linkedinTargets = [typedLinkedin, discoveredLinkedin].filter((url, index, all) => url && all.indexOf(url) === index);
  if (!linkedinTargets.length) {
    attempts.push(
      blockedAttempt(
        "linkedin-fetch",
        "LinkedIn",
        "a LinkedIn URL on the application or the company site",
        "https://www.linkedin.com/",
        "LinkedIn had no profile URL to open.",
      ),
    );
  } else {
    let recorded = false;
    for (const rawUrl of linkedinTargets) {
      let url = rawUrl.replace(/^http:\/\//i, "https://");
      let linked = await pull(fetchText, url);
      const followed = linkedinCompanyFollow(url, linked.text);
      if (followed !== url) {
        const named = await pull(fetchText, followed);
        if (!linkedinBlocked(named.status, named.text, queryFacts)) {
          url = followed;
          linked = named;
        }
      }
      if (linkedinBlocked(linked.status, linked.text, queryFacts)) {
        const lastTarget = linkedinTargets[linkedinTargets.length - 1].replace(/^http:\/\//i, "https://");
        if (!recorded && url.replace(/^http:\/\//i, "https://") === lastTarget) {
          attempts.push(
            blockedAttempt("linkedin-fetch", "LinkedIn", url, url, "LinkedIn blocked automated access. blocked by site."),
          );
          recorded = true;
        }
        continue;
      }
      const ownProfile = /linkedin\.com\/in\//i.test(url);
      const companyPage = /linkedin\.com\/company\//i.test(url);
      if (companyPage && !linkedinCompanyMatchesOrg(url, searchOrg)) {
        continue;
      }
      const selfNamedFirm = firmContainsApplicantName(searchOrg, person);
      const score = scorePublicText(visible(linked.text), queryFacts, { ownFirm: ownProfile || (companyPage && selfNamedFirm) });
      const selfNamedProfile = score.name && selfNamedFirm && (ownProfile || companyPage);
      const blockedTyped = typedLinkedin && typedLinkedin !== url;
      attempts.push({
        key: "linkedin-fetch",
        platform: "LinkedIn",
        searched: blockedTyped ? `${typedLinkedin} and ${url}` : url,
        url,
        outcome: score.confidence === "none" ? "not-found" : "found",
        score,
        detail: blockedTyped
          ? "The typed profile blocked automated access. A public company page linked from the website was readable."
          : score.confidence === "none"
            ? "LinkedIn returned a page"
            : "the public LinkedIn page",
        selfReported: selfNamedProfile || undefined,
      });
      recorded = true;
      break;
    }
    if (!recorded) {
      attempts.push({
        key: "linkedin-fetch",
        platform: "LinkedIn",
        searched: linkedinTargets[0],
        url: linkedinTargets[0].replace(/^http:\/\//i, "https://"),
        outcome: "not-found",
        score: emptyScore(),
        detail: "The LinkedIn company page does not match this company.",
      });
    }
  }
  flush();

  const shortQuery = socialSearchQuery(person, searchOrg);
  const companyTag = instagramCompanyTag(searchOrg, person);
  const profileUrl = (platform: string, fallback: string) => socials.find((item) => item.platform === platform)?.url || fallback;
  const platformJobs: { key: string; platform: string; url: string; searched: string; fromSite: boolean; read: (text: string) => string }[] = [
    {
      key: "screen-x",
      platform: "X",
      url: profileUrl("X", `https://x.com/search?q=${encodeURIComponent(shortQuery)}&src=typed_query&f=live`),
      searched: `${shortQuery} on X`,
      fromSite: socials.some((item) => item.platform === "X"),
      read: visible,
    },
    {
      key: "screen-facebook",
      platform: "Facebook",
      url: profileUrl("Facebook", `https://www.facebook.com/search/top?q=${encodeURIComponent(shortQuery)}`),
      searched: `${shortQuery} on Facebook`,
      fromSite: socials.some((item) => item.platform === "Facebook"),
      read: visible,
    },
    {
      key: "screen-instagram",
      platform: "Instagram",
      url: profileUrl(
        "Instagram",
        companyTag ? `https://www.instagram.com/explore/tags/${encodeURIComponent(companyTag)}/` : "https://www.instagram.com/",
      ),
      searched: `${searchOrg} on Instagram`,
      fromSite: socials.some((item) => item.platform === "Instagram"),
      read: visible,
    },
    {
      key: "screen-youtube",
      platform: "YouTube",
      url: profileUrl("YouTube", `https://www.youtube.com/results?search_query=${encodeURIComponent(shortQuery)}`),
      searched: `${shortQuery} on YouTube`,
      fromSite: socials.some((item) => item.platform === "YouTube"),
      read: (text) => {
        const lines = [...youtubeTitles(text), ...youtubeSnippets(text)];
        return lines.length ? lines.join("\n") : visible(text).slice(0, 2000);
      },
    },
    {
      key: "screen-tiktok",
      platform: "TikTok",
      url: profileUrl("TikTok", `https://www.tiktok.com/search?q=${encodeURIComponent(shortQuery)}`),
      searched: `${shortQuery} on TikTok`,
      fromSite: socials.some((item) => item.platform === "TikTok"),
      read: (text) => tiktokProfileText(text) || visible(text).slice(0, 500),
    },
  ];

  const platformResults = await Promise.all(
    platformJobs.map(async (job) => {
      const response = await pull(fetchText, job.url);
      const preview = job.read(response.text);
      const previewScore = scorePublicText(preview, queryFacts);
      const loginWall = /accounts\/login|onboarding\/web|log in|sign up|cookie policy/i.test(response.text.slice(0, 80_000));
      const walledGarden = job.platform === "X" || job.platform === "Facebook" || job.platform === "Instagram";
      if (accessBlocked(response.status, response.text, job.url) || (walledGarden && (loginWall || previewScore.confidence === "none"))) {
        const detail = job.fromSite
          ? `The company website links ${job.url}, and ${job.platform} blocked automated access.`
          : `${job.platform} blocked automated access.`;
        return blockedAttempt(job.key, job.platform, job.searched, job.url, detail);
      }
      let text = job.read(response.text);
      let url = job.url;
      const needsNameAndPlace = job.platform === "YouTube" || job.platform === "TikTok" || job.platform === "X" || job.platform === "Facebook" || job.platform === "Instagram";
      if (job.platform === "YouTube" && !job.fromSite && !socialMatch(scorePublicText(text, queryFacts))) {
        const altName = alternatePersonNames(person).find((item) => item.toLowerCase() !== person.trim().toLowerCase());
        if (altName) {
          const altUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(socialSearchQuery(altName, searchOrg))}`;
          const second = await pull(fetchText, altUrl);
          const extra = [...youtubeTitles(second.text), ...youtubeSnippets(second.text)];
          if (!accessBlocked(second.status, second.text, altUrl) && extra.length && socialMatch(scorePublicText(extra.join("\n"), queryFacts))) {
            text = [text, ...extra].filter(Boolean).join("\n");
            url = altUrl;
          }
        }
      }
      if (job.platform === "YouTube" && !job.fromSite && url === job.url && youtubeTitles(response.text).length === 0 && youtubeSnippets(response.text).length === 0) {
        return blockedAttempt(job.key, job.platform, job.searched, job.url, "YouTube did not include readable video titles.");
      }
      // Each title is its own page. A person in one video and the company in another is not a match.
      const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
      const perLine = needsNameAndPlace && lines.length > 1
        ? lines.map((line) => ({ line, score: scorePublicText(line, queryFacts) })).sort((left, right) => rank(right.score) - rank(left.score))
        : [];
      const together = perLine.find((item) => socialMatch(item.score));
      const score = together?.score || (perLine[0]?.score ?? scorePublicText(text, queryFacts));
      if (together) text = together.line;
      const counts = needsNameAndPlace ? socialMatch(score) : score.confidence !== "none";
      if (!counts) {
        return {
          key: job.key,
          platform: job.platform,
          searched: job.searched,
          url,
          outcome: "not-found" as const,
          score,
          detail: needsNameAndPlace || score.confidence === "none" ? "no match found" : `${job.platform} responded`,
        };
      }
      const ranked = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ line, score: scorePublicText(line, queryFacts) }))
        .sort((left, right) => rank(right.score) - rank(left.score));
      const matched = ranked.find((item) => item.score.name) || ranked.find((item) => item.score.confidence !== "none");
      const companyLine = matched && score.company && !matched.score.company ? ranked.find((item) => item.score.company) : undefined;
      const detail = [matched?.line, companyLine?.line].filter(Boolean).join(" — ").slice(0, 220);
      return {
        key: job.key,
        platform: job.platform,
        searched: job.searched,
        url,
        outcome: "found" as const,
        score,
        detail: detail || (socialMatch(score) ? `${job.platform} returned a public result` : "no match found"),
      };
    }),
  );
  attempts.push(...platformResults);
  flush();

  const allNews = newsSearchQueries(facts);
  const newsQueries = allNews.filter((_, index) => index < 2 || index >= 3).slice(0, 3);
  const searchedNews = newsQueries.join(" | ") || `${person} ${searchOrg}`;
  let newsBlocked = 0;
  let newsResponded = 0;
  let bestNews: { title: string; score: MatchScore; url: string; kind: "hard" | "civil" | "none"; foreclosureOnly: boolean; rank: number } | null = null;
  for (const query of newsQueries) {
    const newsUrl = googleNewsUrl(query);
    const news = await pull(fetchText, newsUrl);
    const newsFeed = /<(rss|feed|channel)\b/i.test(news.text);
    if (accessBlocked(news.status, news.text, newsUrl) || !newsFeed) {
      newsBlocked += 1;
      continue;
    }
    if (!/<item\b/i.test(news.text)) {
      newsResponded += 1;
      continue;
    }
    newsResponded += 1;
    const titles = rssHeadlines(news.text);
    let decided: { title: string; url: string; score: MatchScore; kind: "hard" | "civil" | "none"; foreclosureOnly: boolean; rank: number } | null = null;
    for (const story of titles) {
      if (isLinkedInDirectory(story.title)) continue;
      const judged = judgeHeadline(story.title, { ...queryFacts, website: facts.website, aliases: queryFacts.aliases });
      if (!judged.person && !judged.company && !judged.aliasOnly) continue;
      const score = scorePublicText(story.title, queryFacts);
      if (judged.aliasOnly && !score.company) score.alias = judged.alias || score.alias;
      const importance = headlineImportance(judged);
      const articleUrl = story.url || newsUrl;
      if (!decided || importance < decided.rank) {
        decided = { title: story.title, url: articleUrl, score, kind: judged.kind, foreclosureOnly: judged.foreclosureOnly, rank: importance };
      }
    }
    if (decided && (!bestNews || decided.rank < bestNews.rank)) bestNews = decided;
    if (bestNews && bestNews.rank === 0) break;
  }
  if (!bestNews && newsBlocked > 0 && newsResponded === 0) {
    attempts.push(
      blockedAttempt(
        "screen-news",
        "Google News",
        searchedNews,
        googleNewsUrl(newsQueries[0] || person),
        "Google News did not return a headline feed.",
      ),
    );
  } else if (bestNews) {
    attempts.push({
      key: "screen-news",
      platform: "Google News",
      searched: searchedNews,
      url: bestNews.url,
      outcome: "found",
      score: bestNews.score,
      detail: bestNews.title.slice(0, 180),
      headlineKind: bestNews.kind,
      foreclosureOnly: bestNews.foreclosureOnly,
    });
  } else {
    attempts.push({
      key: "screen-news",
      platform: "Google News",
      searched: searchedNews,
      url: googleNewsUrl(newsQueries[0] || person),
      outcome: "not-found",
      score: emptyScore(),
      detail: "no match found",
    });
  }
  flush();

  async function startWebSearch() {
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searched)}`;
  const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(searched)}`;
  const ddgSnippetsFrom = (html: string) =>
    [...html.matchAll(/<a\b[^>]*class="(?:result__(?:a|snippet)|result-link)"[^>]*>[\s\S]*?<\/a>/gi)].map((match) => snippetFrom(match[0]));
  const [ddgFirst, bing] = await Promise.all([pullWithin(fetchText, ddgUrl), pullWithin(fetchText, bingUrl)]);
  type SearchSnippet = { text: string; hrefs: string[] };
  type SearchEngine = { name: string; url: string; note: string; snippets: SearchSnippet[] };
  const httpHrefs = (item: SearchSnippet) => item.hrefs.filter((href) => /^https?:\/\//i.test(href));
  const namesBothSnippet = (item: SearchSnippet) => {
    if (isLinkedInDirectory(item.text) || item.hrefs.some((href) => isLinkedInDirectory(href))) return false;
    const score = scorePublicText(item.text, queryFacts);
    return score.name && score.company;
  };
  const independentSnippet = (item: SearchSnippet) => {
    const hrefs = httpHrefs(item);
    if (!hrefs.length) return true;
    return hrefs.some((href) => !hostIsApplicant(href, ownHost));
  };
  const surname = surnameForSearch(person).toLowerCase();
  const companyOnly = !parsePersonName(person)?.given.length;
  const companyAnchors = distinctiveCompanyTokens(searchOrg);
  const containsWord = (text: string, token: string) => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![A-Za-z0-9-])${escaped}(?![A-Za-z0-9-])`, "i").test(text);
  };
  // A page that never says the surname did not answer the quoted query. Quotes were ignored.
  const snippetAnswers = (item: SearchSnippet) => {
    if (companyOnly) return companyAnchors.some((token) => containsWord(item.text, token));
    return Boolean(surname) && containsWord(item.text, surname);
  };
  const engineNote = (status: number, text: string, url: string, snippets: SearchSnippet[], failure?: string): string => {
    if (status === 0 || failure === "timeout" || failure === "network") return failure === "network" ? "network error" : "timed out";
    const challenge =
      status === 202 ||
      (/challenge|captcha/i.test(text.slice(0, 2500)) && !/result__a|result-link|b_algo|class="result"/i.test(text));
    if (challenge) return "challenge page";
    if (accessBlocked(status, text, url) || isBotChallenge(text)) return "blocked";
    if (!snippets.length) return "no results";
    if (!snippets.some(snippetAnswers)) return "unrelated results";
    const named = snippets.filter(namesBothSnippet);
    if (!named.length) return "no name and company";
    if (named.some(independentSnippet)) return "result";
    return "own site";
  };
  const engines: SearchEngine[] = [];
  const ddgSnippets = ddgSnippetsFrom(ddgFirst.text);
  engines.push({ name: "DuckDuckGo", url: ddgUrl, snippets: ddgSnippets, note: engineNote(ddgFirst.status, ddgFirst.text, ddgUrl, ddgSnippets, ddgFirst.failure) });
  const bingSnippets = [...bing.text.matchAll(/<li[^>]*class="[^"]*b_algo[^"]*"[\s\S]*?<\/li>/gi)].map((match) => snippetFrom(match[0]));
  engines.push({ name: "Bing", url: bingUrl, snippets: bingSnippets, note: engineNote(bing.status, bing.text, bingUrl, bingSnippets, bing.failure) });
  if (!engines.some((engine) => engine.note === "result")) {
    const loose = [person, searchOrg].filter(Boolean).join(" ");
    const extras: { name: string; url: string; parse: (text: string) => SearchSnippet[]; delay?: boolean }[] = [];
    if (engines[0]?.note === "challenge page" || engines[0]?.note === "blocked") {
      extras.push({
        name: "DuckDuckGo lite",
        url: `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(loose || searched)}`,
        parse: (text) => ddgSnippetsFrom(text),
        delay: true,
      });
    }
    extras.push(
      {
        name: "Brave",
        url: `https://search.brave.com/search?q=${encodeURIComponent(searched)}&source=web`,
        parse: (text) => braveResultBlocks(text).map((block) => snippetFrom(block)),
      },
      {
        name: "Mojeek",
        url: `https://www.mojeek.com/search?q=${encodeURIComponent(searched)}`,
        parse: (text) => mojeekResultBlocks(text).map((block) => snippetFrom(block)),
      },
      {
        name: "Wikipedia",
        url: `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(searched)}&limit=8`,
        parse: (text) => wikipediaRestResultPages(text).map((row) => ({ text: row.text, hrefs: row.href ? [row.href] : [] })),
      },
      {
        name: "Wikidata",
        url: `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(searched)}&language=en&format=json&limit=8`,
        parse: (text) => wikidataSearchResultPages(text).map((row) => ({ text: row.text, hrefs: row.href ? [row.href] : [] })),
      },
      {
        name: "GDELT",
        url: `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`${person} ${searchOrg}`.trim())}&mode=artlist&format=json&maxrecords=8`,
        parse: (text) => gdeltResultTexts(text).map((text) => ({ text, hrefs: [] })),
      },
    );
    const pulled = await Promise.all(
      extras.map(async (job) => {
        if (job.delay) await new Promise((resolve) => setTimeout(resolve, SEARCH_RETRY_MS));
        const response = await pullWithin(fetchText, job.url);
        const snippets = response.status >= 200 && response.status < 300 ? job.parse(response.text) : [];
        return { name: job.name, url: job.url, snippets, note: engineNote(response.status, response.text, job.url, snippets, response.failure) };
      }),
    );
    engines.push(...pulled);
  }
  const failedNote = (note: string) => note === "timed out" || note === "network error" || note === "blocked" || note === "challenge page" || note === "unrelated results";
  const hardFailure = (note: string) => note === "timed out" || note === "network error" || note === "blocked" || note === "challenge page";
  const cleanAnswer = (note: string) => note === "no results" || note === "no name and company" || note === "result" || note === "own site";
  const usablePage = engines.some((engine) => engine.note === "no name and company" || engine.note === "result" || engine.note === "own site");
  if (!usablePage && engines.some((engine) => failedNote(engine.note))) {
    await new Promise((resolve) => setTimeout(resolve, SEARCH_RETRY_MS * 2));
    const retryJobs: { name: string; url: string; parse: (text: string) => SearchSnippet[] }[] = [
      {
        name: "Bing",
        url: bingUrl,
        parse: (text) => [...text.matchAll(/<li[^>]*class="[^"]*b_algo[^"]*"[\s\S]*?<\/li>/gi)].map((match) => snippetFrom(match[0])),
      },
      {
        name: "DuckDuckGo lite",
        url: `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent([person, searchOrg].filter(Boolean).join(" ") || searched)}`,
        parse: (text) => ddgSnippetsFrom(text),
      },
    ];
    for (const job of retryJobs) {
      const response = await pullWithin(fetchText, job.url);
      const snippets = response.status >= 200 && response.status < 300 ? job.parse(response.text) : [];
      const note = engineNote(response.status, response.text, job.url, snippets, response.failure);
      const rank = (value: string) => (value === "result" || value === "own site" ? 0 : value === "no name and company" ? 1 : value === "unrelated results" ? 2 : 3);
      const existing = engines.find((engine) => engine.name === job.name);
      if (!existing) engines.push({ name: job.name, url: job.url, snippets, note });
      else if (rank(note) < rank(existing.note)) {
        existing.snippets = snippets;
        existing.note = note;
        existing.url = job.url;
      }
    }
  }
  const formal = formalGivenName(person);
  const missedBoth = !engines.some((engine) => engine.note === "result" || engine.note === "own site");
  if (missedBoth && formal) {
    await new Promise((resolve) => setTimeout(resolve, SEARCH_RETRY_MS * 2));
    const parsed = parsePersonName(person);
    const formalPerson = parsed ? [formal, ...parsed.given.slice(1), parsed.surname].filter(Boolean).join(" ") : person;
    const formalSearched = [formalPerson, searchOrg, place].filter(Boolean).map((part) => `"${part}"`).join(" ");
    const loose = [formalPerson, searchOrg].filter(Boolean).join(" ");
    const nicknameJobs: { name: string; url: string; parse: (text: string) => SearchSnippet[] }[] = [
      {
        name: "Bing",
        url: `https://www.bing.com/search?q=${encodeURIComponent(formalSearched)}`,
        parse: (text) => [...text.matchAll(/<li[^>]*class="[^"]*b_algo[^"]*"[\s\S]*?<\/li>/gi)].map((match) => snippetFrom(match[0])),
      },
      {
        name: "DuckDuckGo lite",
        url: `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(loose)}`,
        parse: (text) => ddgSnippetsFrom(text),
      },
    ];
    for (const job of nicknameJobs) {
      const response = await pullWithin(fetchText, job.url);
      const snippets = response.status >= 200 && response.status < 300 ? job.parse(response.text) : [];
      const note = engineNote(response.status, response.text, job.url, snippets, response.failure);
      const rank = (value: string) => (value === "result" || value === "own site" ? 0 : value === "no name and company" ? 1 : value === "unrelated results" ? 2 : 3);
      const existing = engines.find((engine) => engine.name === job.name);
      if (!existing) engines.push({ name: job.name, url: job.url, snippets, note });
      else if (rank(note) <= rank(existing.note)) {
        existing.snippets = snippets;
        existing.note = note;
        existing.url = job.url;
      }
    }
  }
  const tried = engines.map((engine) => `${engine.name} (${engine.note})`).join(", ");
  const order = ["DuckDuckGo", "DuckDuckGo lite", "Bing", "Brave", "Mojeek", "Wikipedia", "Wikidata", "GDELT"];
  const engineNamed = (note: string) =>
    order
      .map((name) => engines.find((engine) => engine.name === name && engine.note === note))
      .find((engine): engine is SearchEngine => Boolean(engine));
  const hitEngine = engineNamed("result") || engineNamed("own site");
  const sawUsablePage = engines.some((engine) => engine.note === "no name and company" || engine.note === "result" || engine.note === "own site");
  const sawClean = engines.some((engine) => cleanAnswer(engine.note));
  const sawIgnored = engines.some((engine) => engine.note === "unrelated results");
  const sawHardFailure = engines.some((engine) => hardFailure(engine.note));
  const sawFailure = engines.some((engine) => failedNote(engine.note));
  const allBlocked = engines.every((engine) => engine.note === "challenge page" || engine.note === "blocked" || engine.note === "timed out" || engine.note === "network error");
  const ddgChallenge = engines.some((engine) => engine.name.startsWith("DuckDuckGo") && engine.note === "challenge page");
  const allTimedOut = engines.every((engine) => engine.note === "timed out" || engine.note === "network error");
  const ddgBlocked = !engines.some((engine) => engine.name.startsWith("DuckDuckGo") && engine.note === "result");
  if (!hitEngine && allBlocked) {
    const closing = allTimedOut
      ? "Not checked. Not a pass."
      : ddgChallenge
        ? "DuckDuckGo returned a challenge page and is not checkable for free. Search blocked."
        : "Web search is not checkable for free.";
    attempts.push(
      blockedAttempt(
        "screen-web",
        "Web search",
        searched,
        ddgUrl,
        `All free search sources blocked. Tried ${tried}. ${closing}`.replace(/\s+/g, " ").trim(),
      ),
    );
  } else if (!hitEngine && !sawClean && sawIgnored && sawHardFailure && !sawUsablePage) {
    attempts.push(
      blockedAttempt(
        "screen-web",
        "Web search",
        searched,
        ddgBlocked ? bingUrl : ddgUrl,
        `Search did not complete. Not checked. Not a pass. Tried ${tried}.`.replace(/\s+/g, " ").trim(),
      ),
    );
  } else if (!hitEngine && !sawClean && sawFailure) {
    attempts.push(
      blockedAttempt(
        "screen-web",
        "Web search",
        searched,
        ddgBlocked ? bingUrl : ddgUrl,
        `Search did not complete. Not checked. Not a pass. Tried ${tried}.`.replace(/\s+/g, " ").trim(),
      ),
    );
  } else if (!hitEngine) {
    attempts.push({
      key: "screen-web",
      platform: "Web search",
      searched,
      url: ddgBlocked ? bingUrl : ddgUrl,
      outcome: "not-found",
      score: emptyScore(),
      detail: `Tried ${tried}. Not found. No free search source returned a page naming both.`,
    });
  } else {
    const independentHit = hitEngine.note === "result";
    const matched = hitEngine.snippets
      .filter((item) => namesBothSnippet(item) && (independentHit ? independentSnippet(item) : !independentSnippet(item)))
      .map((item) => {
        const http = httpHrefs(item);
        const other = http.filter((href) => !hostIsApplicant(href, ownHost));
        const own = http.filter((href) => hostIsApplicant(href, ownHost));
        return { ...item, hrefs: independentHit ? [...other, ...own] : [...own, ...other], score: scorePublicText(item.text, queryFacts) };
      })
      .filter((item) => item.score.name && item.score.company);
    const hit = matched[0];
    if (hit) {
      attempts.push({
        key: "screen-web",
        platform: hitEngine.name === "DuckDuckGo lite" ? "DuckDuckGo" : hitEngine.name,
        searched,
        url: hitEngine.url,
        outcome: "found",
        score: hit.score,
        detail: `Tried ${tried}. ${hit.text.slice(0, 180)} ${hit.hrefs[0] || ""}`.trim(),
        linkedUrl: hit.hrefs.join(" "),
        moreUrls: matched.slice(1).flatMap((item) => item.hrefs).join(" "),
      });
    } else {
      attempts.push({
        key: "screen-web",
        platform: "Web search",
        searched,
        url: ddgBlocked ? bingUrl : ddgUrl,
        outcome: "not-found",
        score: emptyScore(),
        detail: `Tried ${tried}. Not found. No free search source returned a page naming both.`,
      });
    }
  }

  if (!attempts.some((item) => item.key === "web-footprint")) {
    const credited = new Set(
      attempts.filter((item) => item.outcome === "found" && item.key !== "web-footprint").map((item) => canonicalPage(item.url)),
    );
    const webHit = attempts.find(
      (item) => item.key === "screen-web" && item.outcome === "found" && item.score.name && item.score.company && !attemptOnOwnSite(item, ownHost),
    );
    const fresh = `${webHit?.linkedUrl || ""} ${webHit?.moreUrls || ""}`
      .split(/\s+/)
      .map((href) => unwrapResultUrl(href))
      .find((href) => {
        if (!/^https?:\/\//i.test(href)) return false;
        if (isLinkedInDirectory(href)) return false;
        const page = canonicalPage(href);
        if (credited.has(page)) return false;
        if (hostIsApplicant(href, ownHost)) return false;
        return true;
      });
    const alreadyCredited = attempts.find(
      (item) =>
        item.key !== "web-footprint" &&
        item.key !== "screen-web" &&
        item.outcome === "found" &&
        item.score.name &&
        item.score.company &&
        !attemptOnOwnSite(item, ownHost),
    );
    const screenWeb = attempts.find((item) => item.key === "screen-web");
    const screenOwnSite = Boolean(screenWeb && attemptOnOwnSite(screenWeb, ownHost));
    if (webHit && fresh) {
      attempts.push({ ...webHit, key: "web-footprint", url: fresh, linkedUrl: undefined });
    } else if (screenOwnSite) {
      attempts.push({
        key: "web-footprint",
        platform: "Web search",
        searched,
        url: screenWeb?.url || ddgUrl,
        outcome: "not-found",
        score: emptyScore(),
        detail: `Tried ${tried}. The only web search hit was the applicant's own site.`,
      });
    } else if (attempts.some((item) => item.key === "screen-web" && item.outcome === "blocked")) {
      const web = attempts.find((item) => item.key === "screen-web");
      attempts.push(
        blockedAttempt(
          "web-footprint",
          "Web search",
          searched,
          ddgUrl,
          web?.detail || "Public web search was unavailable. Not checked. Not a pass.",
        ),
      );
    } else if (alreadyCredited && alreadyCredited.key !== "screen-youtube" && alreadyCredited.key !== "screen-tiktok") {
      attempts.push({
        key: "web-footprint",
        platform: "Web search",
        searched,
        url: alreadyCredited.url,
        outcome: "not-found",
        score: emptyScore(),
        detail: `same source as ${alreadyCredited.key}`,
      });
    } else {
      attempts.push({
        key: "web-footprint",
        platform: "Web search",
        searched,
        url: ddgBlocked ? bingUrl : ddgUrl,
        outcome: "not-found",
        score: emptyScore(),
        detail: screenWeb?.detail && /Tried /.test(screenWeb.detail) ? screenWeb.detail : `Tried ${tried}. Not found. No free search source returned a page naming both.`,
      });
    }
  }
  flush();
  }

  await webSearchPromise;
  const missingSite = attempts.find((item) => item.key === "website" && item.outcome === "missing");
  if (missingSite) {
    const hrefs = attempts.flatMap((item) => `${item.url || ""} ${item.linkedUrl || ""} ${item.moreUrls || ""}`.split(/\s+/));
    const hostUrl = hrefs.find((href) => {
      try {
        return /^https?:/i.test(href) && hostMatchesOrgLetters(new URL(href).hostname, searchOrg);
      } catch {
        return false;
      }
    });
    if (hostUrl) {
      const page = await pull(fetchText, hostUrl);
      if (page.status >= 200 && page.status < 400 && !isBotChallenge(page.text)) {
        const score = scorePublicText(visible(page.text), { ...queryFacts, org: searchOrg }, { ownFirm: true });
        if (score.name && score.company) {
          missingSite.outcome = "found";
          missingSite.url = hostUrl;
          missingSite.score = score;
          missingSite.detail = "Discovered company site (not on the application)";
          const row = produced.find((item) => item.key === "website");
          if (row) Object.assign(row, toCheck(missingSite, ownHost));
        }
      }
    }
  }
  flush();
  return produced;
}

/** The applicant's own site is one self-reported source. It cannot also be the public web footprint. */
function attemptOnOwnSite(attempt: Attempt, ownHost: string): boolean {
  if (attempt.selfReported || attempt.key === "website") return true;
  return resultPageOnOwnSite(attempt, ownHost);
}

function rank(score: MatchScore): number {
  if (score.confidence === "high") return 4;
  if (score.confidence === "medium") return 3;
  if (score.confidence === "low") return 2;
  return score.name || score.company || score.city ? 1 : 0;
}
