import { formatEtDate } from "@/lib/format";
import { nameTokens, normalizeName } from "@/lib/verify/fuzzy";
import { isQueryEcho, providerAttemptState } from "@/lib/verify/web-search";
import type { ApplicantFacts, CheckOutput, EvidenceStatus } from "@/lib/verify/types";

/** Negative coverage terms. Plurals are included. "client" does not match "lien". */
export const NEWS_NEGATIVE =
  /\b(frauds?|indicted|lawsuits?|sued|arrested|ponzi|scams?|bankruptc(?:y|ies)|sanctions?|investigations?|foreclosures?|liens?)\b|\bsec charges\b/i;

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
  person: boolean;
  company: boolean;
  location: boolean;
};

export function cityPhrase(location: string): string {
  const raw = (location.split(",")[0] || "").replace(/\b\d{5}(?:-\d{4})?\b/g, "").trim();
  return raw.length >= 4 ? raw : "";
}

export function newsSearchQueries(facts: ApplicantFacts): string[] {
  const person = stripQuotes(facts.applicantName);
  const company = stripQuotes(facts.org || facts.name);
  const city = stripQuotes(cityPhrase(facts.location));
  const queries: string[] = [];
  if (person && company && normalizeName(person) !== normalizeName(company)) queries.push(`"${person}" OR "${company}"`);
  else if (person || company) queries.push(`"${person || company}"`);
  if (company && city && normalizeName(city) !== normalizeName(company)) queries.push(`"${company}" "${city}"`);
  return queries;
}

export function gdeltQuery(facts: ApplicantFacts): string {
  const person = quote(facts.applicantName);
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
    items
      .filter((item) => withinNewsWindow(item.publishedAt, now))
      .filter((item) => !isNewsEcho(item.title, item.snippet, queries))
      .flatMap((item) => {
        const blob = `${item.title} ${item.snippet}`;
        const person = Boolean(personName) && textHasName(blob, personName);
        const company = Boolean(companyName) && textHasCompany(blob, companyName);
        if (!person && !company) return [];
        return [
          {
            ...item,
            tone: NEWS_NEGATIVE.test(blob) ? ("negative" as const) : ("neutral" as const),
            person,
            company,
            location: textHasLocation(blob, facts.location),
          },
        ];
      }),
  ).sort(byImportance);
  const shown = spreadStories(kept);
  const summary = newsSummary(shown, providers, ranAt);
  return [summary, ...shown.map((item) => newsStory(item, ranAt))];
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

function newsSummary(items: Classified[], providers: { name: string; state: "responded" | "unavailable" }[], ranAt: string): CheckOutput {
  const responded = providers.filter((provider) => provider.state === "responded").map((provider) => provider.name);
  const blocked = providers.filter((provider) => provider.state === "unavailable").map((provider) => provider.name);
  const feeds = feedSentence(responded, blocked);
  const base = { key: "news", weight: 8, source: responded.join(", ") || blocked.join(", ") || "News", url: "", ranAt };
  if (!responded.length) {
    return {
      ...base,
      status: "UNAVAILABLE",
      finding: `News could not be checked. ${feeds}`.trim(),
    };
  }
  const corroboratedNegative = items.some((item) => item.tone === "negative" && corroborated(item));
  const ambiguousNegative = items.some((item) => item.tone === "negative" && item.person && !item.company && !item.location);
  const aligned = items.some((item) => item.tone === "neutral" && item.person && item.company);
  if (corroboratedNegative) {
    return {
      ...base,
      status: "FAIL",
      reviewFlag: true,
      finding: `Negative coverage names this person or company with the company or city in the same headline. Possible match, needs review. This is not an automatic decline. ${feeds}`.trim(),
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
  const ambiguous = item.tone === "negative" && item.person && !item.company && !item.location;
  const status: EvidenceStatus = ambiguous ? "INCONCLUSIVE" : item.tone === "negative" ? "FAIL" : item.person && item.company ? "PASS" : "INCONCLUSIVE";
  const date = item.publishedAt ? formatEtDate(new Date(item.publishedAt)) : "date not listed";
  const label = ambiguous ? "Possible match, review" : item.tone === "negative" ? "Negative" : "Neutral";
  const outlet = item.source || hostOf(item.url);
  return {
    key: "news-story",
    status,
    weight: 0,
    reviewFlag: ambiguous || undefined,
    finding: `${label} · ${date} · ${item.title.slice(0, 180)}`,
    source: outlet ? `${outlet} via ${item.provider}` : item.provider,
    url: item.url,
    ranAt,
  };
}

function corroborated(item: Classified): boolean {
  if (item.tone !== "negative") return false;
  if (item.person && (item.company || item.location)) return true;
  return item.company && !item.person;
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
  const tokens = nameTokens(name);
  const hay = normalizeName(text);
  if (tokens.length >= 2) return tokens.every((token) => new RegExp(`\\b${escapeRegExp(token)}\\b`).test(hay));
  const phrase = normalizeName(name);
  return phrase.length >= 5 && new RegExp(`\\b${escapeRegExp(phrase)}\\b`).test(hay);
}

function textHasCompany(text: string, org: string): boolean {
  const phrase = normalizeName(org);
  if (phrase.length < 5) return false;
  return new RegExp(`\\b${escapeRegExp(phrase)}\\b`).test(normalizeName(text));
}

function textHasLocation(text: string, location: string): boolean {
  const city = normalizeName(cityPhrase(location));
  if (city.length < 4) return false;
  return new RegExp(`\\b${escapeRegExp(city)}\\b`).test(normalizeName(text));
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
