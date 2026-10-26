import { classifyFetchError, decodeHtmlEntities } from "@/lib/verify/fetch";
import type { ApplicantFacts, CheckOutput, EvidenceStatus } from "@/lib/verify/types";
import { cityPhrase, googleNewsUrl, instagramCompanyTag, newsSearchQueries, socialSearchQuery } from "@/lib/verify/news";
import { alternatePersonNames, distinctiveCompanyTokens, leftTheCompany, mentionsCompany, personHit, surnameForSearch } from "@/lib/verify/public-match";
import { isLinkedInDirectory, wikidataSearchResultTexts, wikipediaRestResultTexts } from "@/lib/verify/web-search";

const COULD_NOT_CHECK = "Couldn't check for free.";

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
};

type FetchText = (url: string, init?: { userAgent?: string }) => Promise<{ ok: boolean; status: number; text: string }>;

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
};

const COMPANY_ONLY = "company confirmed, person NOT confirmed";

export function scorePublicText(text: string, facts: { name: string; org: string; location: string }): MatchScore {
  const hay = text.toLowerCase();
  const hit = personHit(text, facts.name, facts.org);
  const suffixMismatch = hit === "suffix-mismatch";
  const name = hit === "match";
  const company = mentionsCompany(text, facts.org, facts.name);
  const departure = name && company && text.trim().length <= 500 && leftTheCompany(text, facts.org);
  const currentName = name && !departure;
  const city = cityPhrase(facts.location).toLowerCase();
  const cityHit = city.length >= 4 && hay.includes(city);
  let confidence: MatchConfidence = "none";
  if (currentName && company) confidence = "high";
  else if ((currentName && cityHit) || (company && cityHit)) confidence = "medium";
  else if (currentName || company || suffixMismatch) confidence = "low";
  return { name: currentName, company, city: cityHit, confidence, suffixMismatch, departure };
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
  if (/_Incapsula_Resource|cf-chl|challenge-platform|<title>\s*Just a moment|Attention Required!\s*\|\s*Cloudflare|Access Denied[\s\S]{0,120}Reference\s*#/i.test(text)) {
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

const TEAM_PAGE = /about|contact|team|leader|leadership|people|executive|management|our-company|our-firm|our-story|our-team|who-we|professionals?|attorneys?|lawyers?|staff|\bbio\b/i;

/** Probed when the nav did not already link them. A JavaScript menu still leaves these paths. */
export const TEAM_FALLBACK_PATHS = ["/professionals", "/attorneys", "/people", "/leadership", "/our-team", "/team", "/about"];

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
  for (const match of html.matchAll(/href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'=<>`]+))/gi)) {
    const raw = match[1] || match[2] || match[3] || "";
    let url: URL;
    try {
      url = new URL(raw, base);
    } catch {
      continue;
    }
    if (url.origin !== origin) continue;
    if (!TEAM_PAGE.test(`${url.pathname} ${raw}`)) continue;
    url.hash = "";
    const href = url.toString();
    if (seen.has(href) || href === new URL(base).toString()) continue;
    seen.add(href);
    found.push(href);
    if (found.length >= 4) break;
  }
  return found;
}

/** Up to eight sitemap URLs whose path contains the person's last name. Other sitemap paths are not fetched. */
export function sitemapPersonUrls(xml: string, origin: string, lastName: string): string[] {
  const needle = lastName.toLowerCase().replace(/[^a-z]/g, "");
  if (needle.length < 3) return [];
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
    if (!decodeURIComponent(url.pathname).toLowerCase().includes(needle)) continue;
    url.hash = "";
    const href = url.toString();
    if (seen.has(href)) continue;
    seen.add(href);
    found.push(href);
    if (found.length >= 8) break;
  }
  return found;
}

/** Homepage sitemap, or a few people-page sitemaps when the root file is an index. Capped at eight last-name URLs. */
export async function sitemapLastNameUrls(
  fetchText: FetchText,
  origin: string,
  lastName: string,
): Promise<string[]> {
  const root = await pull(fetchText, `${origin}/sitemap.xml`);
  if (root.status < 200 || root.status >= 400 || !root.text.includes("<loc")) return [];
  if (!/<sitemapindex\b/i.test(root.text)) return sitemapPersonUrls(root.text, origin, lastName);
  let base: URL;
  try {
    base = new URL(origin);
  } catch {
    return [];
  }
  const needle = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const children = [...root.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)]
    .map((match) => match[1].trim())
    .filter((loc) => {
      try {
        const url = new URL(loc, base.origin);
        if (url.origin !== base.origin) return false;
        return /team|people|leader|leadership|professional|attorney|staff|bio|about|our-team/i.test(url.pathname) || (needle.length >= 3 && decodeURIComponent(url.pathname).toLowerCase().includes(needle));
      } catch {
        return false;
      }
    })
    .slice(0, 4);
  const found: string[] = [];
  for (const child of children) {
    const page = await pull(fetchText, child);
    if (page.status >= 200 && page.status < 400) found.push(...sitemapPersonUrls(page.text, origin, lastName));
    if (found.length >= 8) break;
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
    { platform: "LinkedIn", re: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-z0-9\-_%&]+\/?/gi },
    { platform: "X", re: /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[a-z0-9_]+\/?/gi },
    { platform: "Facebook", re: /https?:\/\/(?:www\.)?facebook\.com\/[a-z0-9.\-]+\/?/gi },
    { platform: "Instagram", re: /https?:\/\/(?:www\.)?instagram\.com\/[a-z0-9._]+\/?/gi },
    { platform: "YouTube", re: /https?:\/\/(?:www\.)?youtube\.com\/(?:@[a-z0-9_\-]+|channel\/[a-z0-9_\-]+|c\/[a-z0-9_\-]+)/gi },
    { platform: "TikTok", re: /https?:\/\/(?:www\.)?tiktok\.com\/@[a-z0-9._]+\/?/gi },
  ];
  const out: { platform: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern.re)) {
      const url = match[0];
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

function findingFor(attempt: Attempt): { status: EvidenceStatus; finding: string; corroborates: boolean; companyOnly?: boolean; reviewFlag?: boolean } {
  const scoreLine = `Name: ${attempt.score.name ? "yes" : "no"}. Company: ${attempt.score.company ? "yes" : "no"}. City: ${attempt.score.city ? "yes" : "no"}. Confidence: ${attempt.score.confidence}.`;
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
  if (attempt.outcome === "not-found") {
    const lead = attempt.detail === "no match found" ? "no match found" : "No result found that names this person and this company.";
    return {
      status: "INCONCLUSIVE",
      corroborates: false,
      finding: `Searched: ${attempt.searched}. ${lead} ${scoreLine}`.replace(/\s+/g, " ").trim(),
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
      finding: `Searched: ${attempt.searched}. This may no longer be at the company on the application. The page reads as an announced departure. ${attempt.detail} ${scoreLine}`.replace(/\s+/g, " ").trim(),
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
      finding: `Searched: ${attempt.searched}. Found: ${attempt.detail} ${COMPANY_ONLY}. That is company-exists evidence, not a person-to-company link. ${scoreLine}`.replace(/\s+/g, " ").trim(),
    };
  }
  const selfReportedNote = attempt.selfReported
    ? " Self-reported page. Together with a footprint from the same site, this is one applicant-supplied source. It does not by itself corroborate the person."
    : "";
  return {
    status: tied ? "PASS" : "INCONCLUSIVE",
    corroborates: tied && !attempt.selfReported,
    finding: `Searched: ${attempt.searched}. Found: ${attempt.detail}${selfReportedNote} ${scoreLine}`.replace(/\s+/g, " ").trim(),
  };
}

function toCheck(attempt: Attempt, ownHost = ""): CheckOutput {
  const blob = `${attempt.url} ${attempt.detail} ${attempt.linkedUrl || ""}`.toLowerCase();
  const ownSite = Boolean(attempt.selfReported) || Boolean(ownHost && blob.includes(ownHost));
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
    corroborates: judged.corroborates && !ownSite && !judged.companyOnly,
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
): Promise<{ ok: boolean; status: number; text: string; failure?: "nxdomain" | "timeout" | "network" }> {
  try {
    return await fetchText(url, init);
  } catch (error) {
    return { ok: false, status: 0, text: "", failure: classifyFetchError(error) };
  }
}

function snippetFrom(html: string): { text: string; hrefs: string[] } {
  const hrefs = [...html.matchAll(/href\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)].map((match) => match[1] || match[2] || "").filter(Boolean);
  return { text: visible(html), hrefs };
}

function visible(html: string): string {
  return decodeHtmlEntities(
    html
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

export async function runPublicScreen(facts: ApplicantFacts, fetchText: FetchText): Promise<CheckOutput[]> {
  const person = facts.applicantName || facts.name;
  const queryFacts = { name: person, org: facts.org, location: facts.location };
  const searched = [person, facts.org, cityPhrase(facts.location)].filter(Boolean).map((part) => `"${part}"`).join(" ");
  const attempts: Attempt[] = [];

  let website = facts.website.trim();
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  const pages: { url: string; text: string; raw: string }[] = [];
  if (!website) {
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
  } else {
    let home = await pull(fetchText, website);
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
      const detail =
        home.status === 403
          ? "blocked by site (403) — not checkable for free; ask applicant for a team-page URL"
          : blockedBySite
            ? "blocked by site, ask applicant for a team-page URL"
            : "The company website did not respond.";
      attempts.push(blockedAttempt("website", "Company website", website, homeUrl, detail));
    } else {
      const homeChallenge = isBotChallenge(home.text);
      if (!homeChallenge) pages.push({ url: homeUrl, text: visible(home.text), raw: home.text });
      const linked = sameOriginPages(home.text, homeUrl);
      const fallback = fallbackTeamUrls(homeUrl, linked);
      let fromSitemap: string[] = [];
      try {
        const origin = new URL(homeUrl).origin;
        const lastName = surnameForSearch(person);
        fromSitemap = await sitemapLastNameUrls(fetchText, origin, lastName);
      } catch {
        fromSitemap = [];
      }
      const extra = [...new Set([...linked, ...fallback, ...fromSitemap])];
      const more = await Promise.all(extra.map(async (url) => ({ url, response: await pull(fetchText, url) })));
      for (const page of more) {
        if (page.response.status >= 200 && page.response.status < 400 && !isBotChallenge(page.response.text)) {
          pages.push({ url: page.url, text: visible(page.response.text), raw: page.response.text });
        }
      }
      const best = pages
        .map((page) => ({ ...page, score: scorePublicText(page.text, queryFacts) }))
        .sort((left, right) => rank(right.score) - rank(left.score))[0];
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
      } else if (best && best.score.confidence !== "none") {
        attempts.push({
          key: "website",
          platform: "Company website",
          searched: website,
          url: best.url,
          outcome: "found",
          score: best.score,
          detail: "a page on the company site",
          selfReported: true,
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
        });
      }
    }
  }

  const socials = socialLinksFrom(pages.map((page) => page.raw).join("\n"));

  const typedLinkedin = facts.linkedinUrl.trim();
  const discoveredLinkedin = socials.find((item) => item.platform === "LinkedIn")?.url || "";
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
    for (const url of linkedinTargets) {
      const linked = await pull(fetchText, url);
      if (linkedinBlocked(linked.status, linked.text, queryFacts)) {
        if (!recorded && url === linkedinTargets[linkedinTargets.length - 1]) {
          attempts.push(
            blockedAttempt("linkedin-fetch", "LinkedIn", url, url, "LinkedIn blocked automated access. blocked by site."),
          );
          recorded = true;
        }
        continue;
      }
      const score = scorePublicText(visible(linked.text), queryFacts);
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
      });
      recorded = true;
      break;
    }
  }

  const shortQuery = socialSearchQuery(person, facts.org);
  const companyTag = instagramCompanyTag(facts.org, person);
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
      searched: `${facts.org} on Instagram`,
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
          const altUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(socialSearchQuery(altName, facts.org))}`;
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
      const score = scorePublicText(text, queryFacts);
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

  const newsQueries = newsSearchQueries(facts).slice(0, 2);
  const searchedNews = newsQueries.join(" | ") || `${person} ${facts.org}`;
  let newsBlocked = 0;
  let newsResponded = 0;
  let bestNews: { title: string; score: MatchScore; url: string } | null = null;
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
    const titles = [...news.text.matchAll(/<title>([\s\S]*?)<\/title>/gi)]
      .map((match) => match[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").trim())
      .slice(1, 16);
    for (const title of titles) {
      if (isLinkedInDirectory(title)) continue;
      const score = scorePublicText(title, queryFacts);
      if (!socialMatch(score)) continue;
      if (!bestNews || rank(score) > rank(bestNews.score)) bestNews = { title, score, url: newsUrl };
    }
    if (bestNews?.score.confidence === "high") break;
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

  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searched)}`;
  const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(searched)}`;
  const [ddg, bing] = await Promise.all([pull(fetchText, ddgUrl), pull(fetchText, bingUrl)]);
  const ddgSnippets = [...ddg.text.matchAll(/class="result__(?:a|snippet)"[^>]*>([\s\S]*?)<\/a>/gi)].map((match) => snippetFrom(match[0]));
  const bingSnippets = [...bing.text.matchAll(/<li[^>]*class="[^"]*b_algo[^"]*"[\s\S]*?<\/li>/gi)].map((match) => snippetFrom(match[0]));
  const ddgBlocked = accessBlocked(ddg.status, ddg.text, ddgUrl) || serpUnusable(ddgSnippets.map((item) => item.text), queryFacts);
  const bingBlocked = accessBlocked(bing.status, bing.text, bingUrl) || serpUnusable(bingSnippets.map((item) => item.text), queryFacts);
  let wikiUrl = "";
  let wikiSnippets: { text: string; hrefs: string[] }[] = [];
  let wikiBlocked = true;
  if (ddgBlocked && bingBlocked) {
    wikiUrl = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(searched)}&limit=8`;
    const wiki = await pull(fetchText, wikiUrl);
    const texts = wiki.status >= 200 && wiki.status < 300 ? wikipediaRestResultTexts(wiki.text) : [];
    wikiSnippets = texts.map((text) => ({ text, hrefs: [] as string[] }));
    wikiBlocked = accessBlocked(wiki.status, wiki.text, wikiUrl) || texts.length === 0;
  }
  let dataUrl = "";
  let dataSnippets: { text: string; hrefs: string[] }[] = [];
  let dataBlocked = true;
  if (ddgBlocked && bingBlocked && wikiBlocked) {
    dataUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(searched)}&language=en&format=json&limit=8`;
    const data = await pull(fetchText, dataUrl);
    const texts = data.status >= 200 && data.status < 300 ? wikidataSearchResultTexts(data.text) : [];
    dataSnippets = texts.map((text) => ({ text, hrefs: [] as string[] }));
    dataBlocked = accessBlocked(data.status, data.text, dataUrl) || texts.length === 0;
  }
  if (ddgBlocked && bingBlocked && wikiBlocked && dataBlocked) {
    const challenge = ddg.status === 202 || /challenge|captcha/i.test(`${ddgUrl} ${ddg.text.slice(0, 2500)}`);
    attempts.push(
      blockedAttempt(
        "screen-web",
        "Web search",
        searched,
        ddgUrl,
        challenge
          ? "DuckDuckGo returned a challenge page and is not checkable for free."
          : "DuckDuckGo, Bing, Wikipedia, and Wikidata did not return a usable results page. Web search is not checkable for free.",
      ),
    );
  } else {
    const pool = [
      ...(!ddgBlocked ? ddgSnippets.map((item) => ({ ...item, url: ddgUrl, platform: "DuckDuckGo" })) : []),
      ...(!bingBlocked ? bingSnippets.map((item) => ({ ...item, url: bingUrl, platform: "Bing" })) : []),
      ...(!wikiBlocked ? wikiSnippets.map((item) => ({ ...item, url: wikiUrl, platform: "Wikipedia" })) : []),
      ...(!dataBlocked ? dataSnippets.map((item) => ({ ...item, url: dataUrl, platform: "Wikidata" })) : []),
    ];
    const hit = pool
      .filter((item) => !isLinkedInDirectory(item.text) && !item.hrefs.some((href) => isLinkedInDirectory(href)))
      .map((item) => ({ ...item, score: scorePublicText(item.text, queryFacts) }))
      .find((item) => item.score.name && item.score.company);
    if (hit) {
      attempts.push({
        key: "screen-web",
        platform: hit.platform,
        searched,
        url: hit.url,
        outcome: "found",
        score: hit.score,
        detail: hit.text.slice(0, 180),
        linkedUrl: hit.hrefs.join(" "),
      });
    } else {
      attempts.push({
        key: "screen-web",
        platform: "Web search",
        searched,
        url: ddgBlocked ? bingUrl : ddgUrl,
        outcome: "not-found",
        score: emptyScore(),
        detail: "the search page responded",
      });
    }
  }

  const ownHost = applicantHost(website);
  if (!attempts.some((item) => item.key === "web-footprint")) {
    const best = attempts.find(
      (item) => item.outcome === "found" && item.score.name && item.score.company && !attemptOnOwnSite(item, ownHost),
    );
    if (best) {
      attempts.push({ ...best, key: "web-footprint", platform: best.platform });
    } else if (attempts.some((item) => item.key === "screen-web" && item.outcome === "blocked")) {
      const web = attempts.find((item) => item.key === "screen-web");
      attempts.push(
        blockedAttempt(
          "web-footprint",
          "Web search",
          searched,
          ddgUrl,
          web?.detail || "Public web search is not checkable for free.",
        ),
      );
    } else {
      attempts.push({
        key: "web-footprint",
        platform: "Web search",
        searched,
        url: ddgBlocked ? bingUrl : ddgUrl,
        outcome: "not-found",
        score: emptyScore(),
        detail: "no free page named both this person and this company",
      });
    }
  }

  return attempts.map((attempt) => toCheck(attempt, ownHost));
}

/** The applicant's own site is one self-reported source. It cannot also be the public web footprint. */
function attemptOnOwnSite(attempt: Attempt, ownHost: string): boolean {
  if (attempt.selfReported || attempt.key === "website") return true;
  const blob = `${attempt.url} ${attempt.detail} ${attempt.linkedUrl || ""}`.toLowerCase();
  return Boolean(ownHost && blob.includes(ownHost));
}

function rank(score: MatchScore): number {
  if (score.confidence === "high") return 4;
  if (score.confidence === "medium") return 3;
  if (score.confidence === "low") return 2;
  return score.name || score.company || score.city ? 1 : 0;
}
