import { formatEtDate } from "@/lib/format";
import { normalizeName } from "@/lib/verify/fuzzy";
import { companyPhraseTokens, companySearchTerm, isDistinctiveCompanyToken, leftTheCompany, mentionsCompany, mentionsPerson, personHit, personWithoutSuffix, surnameForSearch } from "@/lib/verify/public-match";
import { isQueryEcho, providerAttemptState } from "@/lib/verify/web-search";
import type { ApplicantFacts, CheckOutput, EvidenceStatus } from "@/lib/verify/types";

/** Fraud, sanctions, or a criminal charge. A person-tied hit of this kind can cap the grade. */
export const NEWS_PERSON_HARD =
  /\b(frauds?|indicted|arrested|ponzi|scams?|sanctions?)\b|\bsec charges\b|\bcriminal charges?\b/i;

/**
 * Civil or company-level trouble. A company-only hit is an attention item.
 * It caps the grade only when the applicant's own name is in the headline.
 * REO, a dividend cut or reset, a loss, and a downgrade are ordinary results and are not in this list.
 */
export const NEWS_COMPANY_CIVIL =
  /\b(lawsuits?|sued|bankruptc(?:y|ies)|investigations?|foreclosures?|liens?)\b/i;

/**
 * A civil caption such as "Zumba v. Sciame Construction".
 * The parties stay capitalized so "profits vs last year" is not a docket.
 */
const CIVIL_DOCKET =
  /\b[A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){0,6}\s+[vV](?:[sS]\.?|\.)\s+[A-Z]/;

export function civilDocket(text: string): boolean {
  return CIVIL_DOCKET.test(text);
}

/**
 * A company name that is only a place collides with unrelated headlines.
 * "Bristol" is not enough. "Bristol Development" still matches the full phrase.
 */
const SOLE_PLACE = new Set([
  "bristol",
  "madison",
  "lincoln",
  "newark",
  "trenton",
  "hackensack",
  "dallas",
  "houston",
  "austin",
  "boston",
  "chicago",
  "denver",
  "phoenix",
  "atlanta",
  "seattle",
  "portland",
  "orlando",
  "tampa",
  "miami",
  "brooklyn",
  "manhattan",
  "jersey",
  "philadelphia",
  "baltimore",
]);

/** Negative coverage terms. Plurals are included. "client" does not match "lien". */
export const NEWS_NEGATIVE = new RegExp(`${NEWS_PERSON_HARD.source}|${NEWS_COMPANY_CIVIL.source}`, "i");

const COMMENTARY_BEFORE_NEGATIVE =
  /\b(says|said|plays down|played down|dismisses|dismissed|warns|warned|comments|commented|discusses|discussed|notes|noted)\b/i;

/** A headline that quotes someone discussing bankruptcies or lawsuits is not an allegation against them. */
export function allegedNegative(text: string): boolean {
  const match = NEWS_NEGATIVE.exec(text);
  if (!match || match.index === undefined) return false;
  const before = text.slice(Math.max(0, match.index - 90), match.index);
  return !COMMENTARY_BEFORE_NEGATIVE.test(before);
}

const STORY_LIMIT = 8;

export type NewsItem = {
  title: string;
  snippet: string;
  url: string;
  source: string;
  publishedAt: string | null;
  provider: string;
};

type FetchText = (url: string) => Promise<{ ok: boolean; status: number; text: string }>;

type Classified = NewsItem & {
  tone: "negative" | "neutral";
  kind: "hard" | "civil" | "none";
  person: boolean;
  company: boolean;
  location: boolean;
  departed: boolean;
  suffixMismatch: boolean;
  /** A foreclosure headline is company-level review. It does not cap the grade. */
  foreclosureOnly: boolean;
};

export function cityPhrase(location: string): string {
  const raw = (location.split(",")[0] || "").replace(/\b\d{5}(?:-\d{4})?\b/g, "").trim();
  return raw.length >= 4 ? raw : "";
}

function wordsOf(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 2);
}

/**
 * Person plus the company search term. A word already in the person's name is not repeated,
 * so "Ronald Tutor" is not searched as "tutor" "tutor".
 */
function bareToken(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function personCompanyQuery(person: string, companyTerm: string): string | null {
  const cleanedPerson = person.trim();
  const phrase = companyTerm.trim();
  if (!cleanedPerson || !phrase) return null;
  const seen = new Set(wordsOf(cleanedPerson));
  const kept = phrase.split(/\s+/).filter((word) => {
    const token = bareToken(word);
    return token.length >= 2 && !seen.has(token);
  });
  const distinctive = kept.filter((word) => isDistinctiveCompanyToken(bareToken(word)));
  if (distinctive.length) return `"${cleanedPerson}" "${distinctive.join(" ")}"`;
  const words = phrase.split(/\s+/).filter(Boolean);
  const phraseHasDistinctive = words.some((word) => isDistinctiveCompanyToken(bareToken(word)));
  // "estate" alone is a generic leftover, not a firm. A full name that still contains the brand is kept.
  if (!phraseHasDistinctive && words.length < 2) return null;
  return `"${cleanedPerson}" "${phrase}"`;
}

/** Quoted person-and-company query used by news, YouTube, and the other public searches. */
export function socialSearchQuery(person: string, org: string): string {
  const cleaned = personWithoutSuffix(stripQuotes(person));
  const term = companySearchTerm(stripQuotes(org), cleaned);
  return personCompanyQuery(cleaned, term) || (cleaned ? `"${cleaned}"` : "");
}

/** Instagram tag. A tag that is only the applicant's surname is not used. */
export function instagramCompanyTag(org: string, person: string): string {
  const cleaned = personWithoutSuffix(stripQuotes(person));
  const term = companySearchTerm(stripQuotes(org), cleaned);
  const surname = surnameForSearch(cleaned).toLowerCase();
  const tag = term.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const personWords = new Set(wordsOf(cleaned));
  if (tag && tag !== surname && !personWords.has(tag)) return tag;
  return companyPhraseTokens(stripQuotes(org))
    .filter((word) => word !== surname && !personWords.has(word))
    .join("");
}

export function newsSearchQueries(facts: ApplicantFacts): string[] {
  const person = personWithoutSuffix(stripQuotes(facts.applicantName));
  const company = stripQuotes(facts.org || facts.name);
  const city = stripQuotes(cityPhrase(facts.location));
  const term = companySearchTerm(company, person);
  const last = surnameForSearch(person);
  const queries: string[] = [];
  const personQuery = personCompanyQuery(person, term);
  if (personQuery) queries.push(personQuery);
  else if (person || company) queries.push(`"${person || company}"`);
  if (last && normalizeName(last) !== normalizeName(person)) {
    const lastQuery = personCompanyQuery(last, term);
    if (lastQuery) queries.push(lastQuery);
  }
  if (company && city && normalizeName(city) !== normalizeName(company)) queries.push(`"${company}" "${city}"`);
  return [...new Set(queries)].slice(0, 3);
}

export function gdeltQuery(facts: ApplicantFacts): string {
  const person = quote(personWithoutSuffix(facts.applicantName));
  const company = quote(facts.org || facts.name);
  const city = quote(cityPhrase(facts.location));
  const parts: string[] = [];
  if (person && person !== company) parts.push(person);
  if (company) parts.push(company);
  if (company && city) parts.push(`(${company} ${city})`);
  if (parts.length === 1) return parts[0];
  return `(${parts.join(" OR ")})`;
}

export function googleNewsUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:5y`)}&hl=en-US&gl=US&ceid=US:en`;
}

export function bingNewsUrl(query: string): string {
  return `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&setlang=en-US`;
}

export function gdeltStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

export function gdeltNewsUrl(query: string, now = new Date()): string {
  const start = new Date(now.getTime());
  start.setUTCFullYear(start.getUTCFullYear() - 5);
  return `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=25&startdatetime=${gdeltStamp(start)}&enddatetime=${gdeltStamp(now)}`;
}

export function parseNewsDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const gdelt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/.exec(trimmed) || /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(trimmed);
  if (gdelt) {
    const iso = `${gdelt[1]}-${gdelt[2]}-${gdelt[3]}T${gdelt[4]}:${gdelt[5]}:${gdelt[6]}Z`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Undated RSS items stay. A parsed date older than five years is dropped. */
export function withinNewsWindow(iso: string | null, now: Date): boolean {
  if (!iso) return true;
  const published = new Date(iso).getTime();
  if (Number.isNaN(published)) return true;
  const cutoff = new Date(now.getTime());
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 5);
  return published >= cutoff.getTime();
}

export function feedBodyState(status: number, text: string, kind: "rss" | "json"): "unavailable" | "no-data" | "ready" {
  if (providerAttemptState(status, 1) === "unavailable") return "unavailable";
  if (kind === "rss") {
    if (!/<(rss|feed|item|entry)\b/i.test(text)) return "unavailable";
    return /<item\b/i.test(text) ? "ready" : "no-data";
  }
  try {
    const parsed = JSON.parse(text) as { articles?: unknown };
    if (!parsed || !Array.isArray(parsed.articles)) return "unavailable";
    return parsed.articles.length ? "ready" : "no-data";
  } catch {
    return "unavailable";
  }
}

export function parseRssItems(xml: string, provider: string): NewsItem[] {
  const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, 20);
  const items: NewsItem[] = [];
  for (const match of blocks) {
    const item = parseRssItem(match[0], provider);
    if (item) items.push(item);
  }
  return items;
}

export function parseGdeltArticles(payload: string): NewsItem[] {
  try {
    const parsed = JSON.parse(payload) as { articles?: Record<string, string>[] };
    if (!Array.isArray(parsed.articles)) return [];
    return parsed.articles.slice(0, 25).flatMap((row) => {
      const title = cleanText(row.title || "");
      const url = safeHttpUrl(row.url || "");
      if (!title || !url) return [];
      return [
        {
          title,
          snippet: "",
          url,
          source: cleanText(row.domain || ""),
          publishedAt: parseNewsDate(row.seendate || ""),
          provider: "GDELT",
        },
      ];
    });
  } catch {
    return [];
  }
}

export function isNewsEcho(title: string, snippet: string, queries: string[]): boolean {
  const blob = `${title} ${snippet}`.trim();
  return queries.some((query) => isQueryEcho(title, query) || isQueryEcho(blob, query) || normalizeName(title) === normalizeName(query));
}

/** Identical headlines are one story. This runs before a headline is scored or saved. */
export function dedupeNewsItems<T extends { title: string; url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = normalizeName(item.title).slice(0, 140) || item.url;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function classifyNews(
  facts: ApplicantFacts,
  items: NewsItem[],
  providers: { name: string; state: "responded" | "unavailable" }[],
  now = new Date(),
): CheckOutput[] {
  const queries = newsSearchQueries(facts);
  const ranAt = now.toISOString();
  const personName = facts.applicantName.trim();
  const companyName = (facts.org || facts.name).trim();
  const kept = dedupe(
    dedupeNewsItems(items)
      .filter((item) => withinNewsWindow(item.publishedAt, now))
      .filter((item) => !isNewsEcho(item.title, item.snippet, queries))
      .flatMap((item) => {
        const blob = `${item.title} ${item.snippet}`;
        const judged = judgeHeadline(blob, {
          name: personName,
          applicantName: personName,
          org: companyName,
          location: facts.location,
        });
        if (!judged.person && !judged.company && !judged.suffixMismatch) return [];
        return [{ ...item, ...judged }];
      }),
  ).sort(byImportance);
  const shown = spreadStories(kept);
  const summary = newsSummary(shown, providers, ranAt, companyName);
  return [summary, ...shown.map((item) => newsStory(item, ranAt))];
}

/** Story rows keep INCONCLUSIVE so they do not count as a pass. The table says Headline or Review instead of No data. */
export function newsStoryChipLabel(checkKey: string, status: string, finding: string): string | null {
  if (checkKey !== "news-story" || status !== "INCONCLUSIVE") return null;
  return finding.startsWith("Possible match") ? "Review" : "Headline";
}

export async function newsChecks(facts: ApplicantFacts, fetchText: FetchText, now = new Date()): Promise<CheckOutput[]> {
  const queries = newsSearchQueries(facts);
  if (!queries.length) {
    return [
      {
        key: "news",
        status: "NOT_RUN",
        weight: 8,
        finding: "News was not run. No person or company name was on the application.",
        source: "News",
        url: "",
        ranAt: now.toISOString(),
      },
    ];
  }
  const collected: NewsItem[] = [];
  const providers: { name: string; state: "responded" | "unavailable" }[] = [];
  const google = await loadProvider("Google News", queries.map(googleNewsUrl), "rss", fetchText);
  const bing = await loadProvider("Bing News", queries.map(bingNewsUrl), "rss", fetchText);
  const gdelt = await loadProvider("GDELT", [gdeltNewsUrl(gdeltQuery(facts), now)], "json", fetchText);
  for (const provider of [google, bing, gdelt]) {
    providers.push({ name: provider.name, state: provider.state });
    collected.push(...provider.items);
  }
  return classifyNews(facts, collected, providers, now);
}

function newsSummary(
  items: Classified[],
  providers: { name: string; state: "responded" | "unavailable" }[],
  ranAt: string,
  companyName: string,
): CheckOutput {
  const responded = providers.filter((provider) => provider.state === "responded").map((provider) => provider.name);
  const blocked = providers.filter((provider) => provider.state === "unavailable").map((provider) => provider.name);
  const feeds = feedSentence(responded, blocked);
  const personHardItem = items.find((item) => item.kind === "hard" && item.person && (item.company || item.location));
  const companyHardItem = items.find((item) => item.kind === "hard" && !item.person && item.company);
  const personNamedCivilItem = items.find(
    (item) => item.kind === "civil" && item.person && (item.company || item.location) && !item.foreclosureOnly,
  );
  const ambiguousItem = items.find((item) => item.tone === "negative" && item.person && !item.company && !item.location);
  const foreclosureItem = items.find((item) => item.foreclosureOnly && item.company);
  const companyLitigationItem = items.find((item) => item.kind === "civil" && !item.person && item.company);
  const deciding =
    personHardItem ||
    companyHardItem ||
    personNamedCivilItem ||
    ambiguousItem ||
    foreclosureItem ||
    companyLitigationItem ||
    items.find((item) => item.person && item.company) ||
    items[0];
  const evidenceUrl = deciding?.url || "";
  const base = { key: "news", weight: 8, source: responded.join(", ") || blocked.join(", ") || "News", url: evidenceUrl, ranAt };
  if (!responded.length) {
    return {
      ...base,
      status: "UNAVAILABLE",
      finding: `News could not be checked. ${feeds}`.trim(),
    };
  }
  const personHard = Boolean(personHardItem);
  const companyHard = Boolean(companyHardItem);
  const personNamedCivil = Boolean(personNamedCivilItem);
  const ambiguousNegative = Boolean(ambiguousItem);
  const companyLitigation = Boolean(foreclosureItem || companyLitigationItem);
  const aligned = items.some((item) => item.tone === "neutral" && item.person && item.company && !item.departed);
  const departure = items.some((item) => item.departed && item.person);
  const suffixMismatch = items.find((item) => item.suffixMismatch);
  if (personHard) {
    return {
      ...base,
      status: "FAIL",
      reviewFlag: true,
      finding: `Negative coverage names this person with the company or city near fraud, sanctions, or a criminal charge. Possible match, needs review. This is not an automatic decline. ${feeds}`.trim(),
    };
  }
  if (companyHard) {
    return {
      ...base,
      status: "FAIL",
      reviewFlag: true,
      finding: `Negative coverage names this company near fraud, sanctions, or a criminal charge. Possible match, needs review. This is not an automatic decline. ${feeds}`.trim(),
    };
  }
  if (personNamedCivil) {
    return {
      ...base,
      status: "FAIL",
      reviewFlag: true,
      finding: `A civil headline names this person with the company or city. Possible match, needs review. This is not an automatic decline. ${feeds}`.trim(),
    };
  }
  if (ambiguousNegative) {
    return {
      ...base,
      status: "INCONCLUSIVE",
      reviewFlag: true,
      finding: `Possible match, needs review. A headline names this person near a negative term without the company or city. This is not a failure. ${feeds}`.trim(),
    };
  }
  if (companyLitigation) {
    return {
      ...base,
      status: "INCONCLUSIVE",
      finding: `Company-level litigation headline. A lawsuit or similar civil term names the company. This is an attention item for Richard, not an automatic review flag, and it does not tie fraud or a criminal charge to the person. ${feeds}`.trim(),
    };
  }
  if (suffixMismatch && !aligned) {
    return {
      ...base,
      status: "INCONCLUSIVE",
      reviewFlag: true,
      finding: `A different generational suffix is in this headline, so the name did not match. Needs review. ${feeds}`.trim(),
    };
  }
  if (departure && !aligned) {
    return {
      ...base,
      status: "INCONCLUSIVE",
      reviewFlag: true,
      finding: `This may no longer be at ${companyName || "the company on the application"}. The headline is an announced departure, not current employment. ${feeds}`.trim(),
    };
  }
  if (aligned) {
    return {
      ...base,
      status: "PASS",
      corroborates: true,
      finding: `Neutral coverage names this person and company. Query-echo headlines were ignored. ${feeds}`.trim(),
    };
  }
  if (items.length) {
    return {
      ...base,
      status: "INCONCLUSIVE",
      finding: `A headline names the person or the company, without a negative term tying them together. ${feeds}`.trim(),
    };
  }
  return {
    ...base,
    status: "INCONCLUSIVE",
    finding: `No data found. None of the headlines named this person or company. ${feeds}`.trim(),
  };
}

function newsStory(item: Classified, ranAt: string): CheckOutput {
  const ambiguous = item.tone === "negative" && item.person && !item.company && !item.location && !item.foreclosureOnly;
  const personHard = item.kind === "hard" && item.person && (item.company || item.location);
  const personNamedCivil = item.kind === "civil" && item.person && (item.company || item.location) && !item.foreclosureOnly;
  const companyCivil = (item.kind === "civil" && !item.person) || item.foreclosureOnly;
  const status: EvidenceStatus = personHard || personNamedCivil ? "FAIL" : "INCONCLUSIVE";
  const date = item.publishedAt ? formatEtDate(new Date(item.publishedAt)) : "date not listed";
  const label = item.suffixMismatch
    ? "Different suffix"
    : item.departed
      ? "Departure"
      : ambiguous
        ? "Possible match, review"
        : personHard
          ? "Negative"
          : personNamedCivil
            ? "Civil, names applicant"
            : companyCivil
              ? "Company litigation"
              : "Neutral";
  const outlet = item.source || hostOf(item.url);
  return {
    key: "news-story",
    status,
    weight: 0,
    reviewFlag: ambiguous || personNamedCivil || item.departed || item.suffixMismatch || undefined,
    finding: `${label} · ${date} · ${item.title.slice(0, 180)}`,
    source: outlet ? `${outlet} via ${item.provider}` : item.provider,
    url: item.url,
    ranAt,
  };
}

function corroborated(item: Classified): boolean {
  return item.kind === "hard" && item.person && (item.company || item.location);
}

function negativeKind(text: string): "hard" | "civil" | "none" {
  if (NEWS_PERSON_HARD.test(text) && allegedNegative(text)) return "hard";
  if (civilDocket(text)) return "civil";
  if (NEWS_COMPANY_CIVIL.test(text) && allegedNegative(text)) return "civil";
  return "none";
}

/** Foreclosure without a fraud term, a docket, or another civil charge. Review, not a grade cap. */
export function foreclosureOnly(text: string): boolean {
  if (!/\bforeclosures?\b/i.test(text)) return false;
  if (NEWS_PERSON_HARD.test(text)) return false;
  if (civilDocket(text)) return false;
  return !/\b(lawsuits?|sued|bankruptc(?:y|ies)|investigations?|liens?)\b/i.test(text);
}

/**
 * The same headline judgement used by the news check and by screen-news.
 * "trust" is not enough to make a company hit. A foreclosure is company-level review.
 */
export function judgeHeadline(
  text: string,
  facts: { name: string; applicantName?: string; org: string; location: string },
): Omit<Classified, keyof NewsItem> {
  const personName = (facts.applicantName || facts.name).trim();
  const companyName = facts.org.trim();
  const hit = personName ? personHit(text, personName, companyName) : "none";
  const person = hit === "match";
  const company = Boolean(companyName) && textHasCompany(text, companyName, personName);
  const kind = negativeKind(text);
  return {
    tone: kind === "none" ? "neutral" : "negative",
    kind,
    person,
    company,
    location: textHasLocation(text, facts.location),
    departed: person && company && leftTheCompany(text, companyName),
    suffixMismatch: hit === "suffix-mismatch",
    foreclosureOnly: kind === "civil" && foreclosureOnly(text),
  };
}

function feedSentence(responded: string[], blocked: string[]): string {
  const parts: string[] = [];
  if (responded.length) parts.push(`${responded.join(", ")} responded`);
  if (blocked.length) parts.push(`Unavailable: ${blocked.join(", ")}.`);
  return parts.join(". ").replace(/\s+/g, " ").trim();
}

async function loadProvider(
  name: string,
  urls: string[],
  kind: "rss" | "json",
  fetchText: FetchText,
): Promise<{ name: string; state: "responded" | "unavailable"; items: NewsItem[] }> {
  let responded = false;
  const items: NewsItem[] = [];
  for (const url of urls) {
    let response: { ok: boolean; status: number; text: string };
    try {
      response = await fetchText(url);
    } catch {
      response = { ok: false, status: 0, text: "" };
    }
    const state = feedBodyState(response.status, response.text, kind);
    if (state === "unavailable") continue;
    responded = true;
    if (state === "ready") {
      const parsed = kind === "rss" ? parseRssItems(response.text, name) : parseGdeltArticles(response.text);
      items.push(...parsed);
    }
  }
  return { name, state: responded ? "responded" : "unavailable", items };
}

function parseRssItem(block: string, provider: string): NewsItem | null {
  const source = inner(block, "source");
  let title = inner(block, "title");
  if (source && title.toLowerCase().endsWith(` - ${source.toLowerCase()}`)) title = title.slice(0, -(source.length + 3)).trim();
  const url = articleUrl(inner(block, "link"));
  if (!title || !url) return null;
  return {
    title,
    snippet: inner(block, "description"),
    url,
    source,
    publishedAt: parseNewsDate(inner(block, "pubDate") || inner(block, "published")),
    provider,
  };
}

function inner(block: string, tag: string): string {
  const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  return match ? cleanText(match[1]) : "";
}

function cleanText(value: string): string {
  const cdata = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1");
  const decoded = decodeEntities(cdata);
  return decodeEntities(decoded.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCharCode(Number(digits)));
}

function articleUrl(raw: string): string {
  const direct = safeHttpUrl(raw);
  if (!direct) return "";
  try {
    const parsed = new URL(direct);
    const innerUrl = parsed.searchParams.get("url");
    if (innerUrl) {
      const unwrapped = safeHttpUrl(innerUrl);
      if (unwrapped) return unwrapped;
    }
  } catch {
    return direct;
  }
  return direct;
}

function safeHttpUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function textHasName(text: string, name: string): boolean {
  return mentionsPerson(text, name);
}

function textHasCompany(text: string, org: string, person = ""): boolean {
  const phrase = companyPhraseTokens(org);
  const distinctive = phrase.filter((token) => isDistinctiveCompanyToken(token));
  if (phrase.length === 1 && distinctive.length === 1 && SOLE_PLACE.has(distinctive[0])) return false;
  return mentionsCompany(text, org, person);
}

function textHasLocation(text: string, location: string): boolean {
  const city = normalizeName(cityPhrase(location));
  if (city.length < 4) return false;
  return new RegExp(`(?<![A-Za-z0-9-])${escapeRegExp(city)}(?![A-Za-z0-9-])`).test(normalizeName(text));
}

function dedupe(items: Classified[]): Classified[] {
  const seen = new Set<string>();
  const out: Classified[] = [];
  for (const item of items) {
    const key = normalizeName(item.title).slice(0, 140) || item.url;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function byImportance(left: Classified, right: Classified): number {
  const rank = (item: Classified) => {
    if (item.tone === "negative" && corroborated(item)) return 0;
    if (item.tone === "negative") return 1;
    if (item.person && item.company) return 2;
    if (item.company) return 3;
    return 4;
  };
  const gap = rank(left) - rank(right);
  if (gap) return gap;
  return Date.parse(right.publishedAt || "") - Date.parse(left.publishedAt || "") || 0;
}

function spreadStories(items: Classified[]): Classified[] {
  const picked: Classified[] = [];
  const deferred: Classified[] = [];
  const counts = new Map<string, number>();
  for (const item of items) {
    const count = counts.get(item.provider) ?? 0;
    if (count >= 4) {
      deferred.push(item);
      continue;
    }
    picked.push(item);
    counts.set(item.provider, count + 1);
    if (picked.length >= STORY_LIMIT) return picked;
  }
  for (const item of deferred) {
    if (picked.length >= STORY_LIMIT) break;
    picked.push(item);
  }
  return picked;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function stripQuotes(value: string): string {
  return value.replace(/"/g, "").trim();
}

function quote(value: string): string {
  const cleaned = stripQuotes(value);
  return cleaned ? `"${cleaned}"` : "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
