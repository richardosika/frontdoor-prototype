export const USER_AGENT = "PrivateFloorClub/1.0 (verification; connect@privatefloorclub.com)";

/** Honest identifying agent for every host. Social sites that block it are not checkable for free. A 403 is not retried with a browser user agent. */
export function userAgentFor(host: string): string {
  void host;
  return USER_AGENT;
}
const lastByHost = new Map<string, number>();
const responseCache = new Map<string, { at: number; value: { ok: boolean; status: number; text: string; url?: string } }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export function minHostGapMs(host: string): number {
  return host === "api.gdeltproject.org" ? 5000 : 1000;
}

export function retryDelayMs(url: string): number {
  try {
    if (new URL(url).host === "api.gdeltproject.org") return 5000;
  } catch {
    return 700;
  }
  return 700;
}

function cacheable(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.host === "api.gdeltproject.org" || parsed.host === "news.google.com") return true;
    return parsed.host === "www.bing.com" && parsed.pathname.startsWith("/news/");
  } catch {
    return false;
  }
}

export function clearFetchCache(): void {
  responseCache.clear();
  lastByHost.clear();
}

/**
 * Body and time limits for one URL.
 * SEC ticker and filing JSON are larger than the 180KB default. lookupEdgar calls the
 * shared fetch with only a URL, so those hosts have to opt into the larger cap here.
 * A truncated company_tickers.json does not parse, and every EDGAR check then looks blocked.
 */
export function fetchLimits(url: string): { timeoutMs: number; maxChars: number } {
  let host = "";
  let path = "";
  try {
    const parsed = new URL(url);
    host = parsed.host;
    path = parsed.pathname;
  } catch {
    return { timeoutMs: 8000, maxChars: 180_000 };
  }
  // sitemap.xml is a URL list, not an HTML page. The 180KB HTML cap cuts it off before the team URLs.
  if (/\/sitemap[^/]*\.xml$/i.test(path)) return { timeoutMs: 15_000, maxChars: 1_500_000 };
  if (host.endsWith("sec.gov")) {
    const tickers = url.includes("company_tickers");
    return { timeoutMs: tickers ? 20_000 : 15_000, maxChars: tickers ? 2_000_000 : 1_500_000 };
  }
  if (host.endsWith("youtube.com")) return { timeoutMs: 8000, maxChars: 1_200_000 };
  if (host.endsWith("linkedin.com")) return { timeoutMs: 8000, maxChars: 450_000 };
  if (host.endsWith("tiktok.com")) return { timeoutMs: 8000, maxChars: 500_000 };
  return { timeoutMs: 8000, maxChars: 180_000 };
}

export function limitText(text: string, maxChars: number): string {
  if (!Number.isFinite(maxChars) || maxChars < 0) return text;
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

/** HTML pages only. RSS, sitemap XML, and JSON stay byte-for-byte so their parsers still see the markup. */
export function looksLikeHtml(text: string): boolean {
  const head = text.slice(0, 1200).trimStart().toLowerCase();
  if (!head.startsWith("<")) return false;
  if (
    head.startsWith("<?xml") ||
    head.startsWith("<rss") ||
    head.startsWith("<feed") ||
    head.startsWith("<urlset") ||
    head.startsWith("<sitemapindex")
  ) {
    return false;
  }
  return /<!doctype html\b|<html\b|<head\b|<body\b|<script\b|<style\b/.test(head);
}

export function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, " ");
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ndash: "-",
  mdash: "-",
};

function entityChar(code: number): string {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return " ";
  return String.fromCodePoint(code);
}

/** Decode the entities that split names (&nbsp;, &amp;, numeric). Unknown entities stay as written. */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]+);/gi, (entity, raw: string) => {
    const name = raw.toLowerCase();
    if (NAMED_ENTITIES[name]) return NAMED_ENTITIES[name];
    if (name.startsWith("#x")) return entityChar(Number.parseInt(name.slice(2), 16));
    if (name.startsWith("#")) return entityChar(Number.parseInt(name.slice(1), 10));
    return entity;
  });
}

/**
 * YouTube search results and same-origin nav paths live inside script JSON.
 * Keep those lines, then strip every script so the rest of the page stays small.
 */
function preservedStructuredText(html: string): string {
  const lines: string[] = [];
  for (const match of html.matchAll(/"title":\{"runs":\[\{"text":"([^"]{3,180})"/g)) lines.push(match[0]);
  for (const match of html.matchAll(/"snippetText":\{"runs":\[([\s\S]*?)\]\}/g)) {
    if (match[0].length <= 2000) lines.push(match[0]);
  }
  const decoded = html.replace(/\\\//g, "/").replace(/\\"/g, '"');
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const match of decoded.matchAll(/"(?:url|href|permalink|path|slug)"\s*:\s*"([^"]+)"/g)) {
    let value = match[1].trim();
    if (value.length < 2 || value.length > 240 || seen.has(value)) continue;
    if (!value.startsWith("/") && !/^https?:\/\//i.test(value)) {
      if (/^[a-z0-9][a-z0-9./_-]*\/[a-z0-9._-]+$/i.test(value)) value = `/${value}`;
      else continue;
    }
    if (/\.(?:js|mjs|css|png|jpe?g|gif|svg|webp|ico|woff2?)(?:$|\?)/i.test(value)) continue;
    seen.add(value);
    paths.push(value);
  }
  // A bio path such as /w/james-nelson can sit after dozens of service URLs. Keep those first.
  const rank = (value: string) => (/\/w\/|leadership|executive|\/people\/|\/team\/|\/bio\/|professionals|attorneys|our-team|our-people/i.test(value) ? 0 : /about|staff|lawyer/i.test(value) ? 1 : 2);
  paths.sort((left, right) => rank(left) - rank(right));
  for (const value of paths.slice(0, 60)) lines.push(`"url":"${value}"`);
  return lines.join("\n");
}

/**
 * Strip style, script, and head, then decode entities, then apply the size cap.
 * A 180KB head or stylesheet must not cut off the team-page text that follows it.
 * Titles and nav paths are copied out of script JSON before that strip.
 */
export function prepareFetchedText(text: string, maxChars: number): string {
  if (!looksLikeHtml(text)) return limitText(text, maxChars);
  const kept = preservedStructuredText(text);
  const stripped = decodeHtmlEntities(stripScriptsAndStyles(text));
  return limitText(kept ? `${stripped}\n${kept}` : stripped, maxChars);
}

/** Retry network failures, rate limits, and server errors. A normal 4xx, a challenge page, and NXDOMAIN are final. */
export function shouldRetryStatus(status: number): boolean {
  return status === 0 || status === 429 || status >= 500;
}

/** One longer try after a timer abort. A dead domain and an HTTP error are not timeouts. */
export function nextTimeoutMs(result: { failure?: FetchFailure }, timeoutMs: number): number | null {
  if (result.failure !== "timeout") return null;
  return timeoutMs * 2;
}

export type FetchFailure = "nxdomain" | "timeout" | "network";

/** DNS NXDOMAIN/ENOTFOUND is a dead domain. An aborted timer is a timeout. Anything else is a network error. */
export function classifyFetchError(error: unknown): FetchFailure {
  const codes: string[] = [];
  const names: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const record = current as { code?: unknown; name?: unknown; message?: unknown; cause?: unknown };
    if (typeof record.code === "string") codes.push(record.code);
    if (typeof record.name === "string") names.push(record.name);
    if (typeof record.message === "string" && /NXDOMAIN|ENOTFOUND|getaddrinfo/i.test(record.message)) codes.push("ENOTFOUND");
    current = record.cause;
  }
  if (codes.some((code) => code === "ENOTFOUND" || code === "ENODATA" || code === "NXDOMAIN")) return "nxdomain";
  if (names.some((name) => name === "AbortError" || name === "TimeoutError")) return "timeout";
  return "network";
}

export async function politeFetch(
  url: string,
  timeoutMs = 8000,
  options?: { maxChars?: number },
): Promise<{ ok: boolean; status: number; text: string; url?: string }> {
  const timeout = Math.max(timeoutMs, fetchLimits(url).timeoutMs);
  if (cacheable(url)) {
    const cached = responseCache.get(url);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  }
  let latest = await fetchOnce(url, timeout, options);
  for (let attempt = 1; attempt <= 2 && retryable(latest); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs(url) * attempt));
    latest = await fetchOnce(url, timeout, options);
  }
  const longer = nextTimeoutMs(latest, timeout);
  if (longer) latest = await fetchOnce(url, longer, options);
  if (cacheable(url) && latest.status >= 200 && latest.status < 300) responseCache.set(url, { at: Date.now(), value: latest });
  return latest;
}

/** Check pipeline fetch. A caller cannot substitute a browser user agent. */
export function fetchForChecks(url: string): Promise<{ ok: boolean; status: number; text: string; url?: string }> {
  return politeFetch(url, 8000);
}

function retryable(result: { status: number; failure?: FetchFailure }): boolean {
  if (result.failure === "nxdomain") return false;
  return shouldRetryStatus(result.status);
}

/** Headers can arrive and the body can still stall. Abandon it on the same budget as the request. */
async function readBody(response: Response, timeoutMs: number): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      response.text(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          void response.body?.cancel().catch(() => undefined);
          reject(Object.assign(new Error("The operation was aborted"), { name: "TimeoutError" }));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchOnce(
  url: string,
  timeoutMs: number,
  options?: { maxChars?: number },
): Promise<{ ok: boolean; status: number; text: string; url?: string; failure?: FetchFailure }> {
  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    return { ok: false, status: 0, text: "" };
  }
  const last = lastByHost.get(host) ?? 0;
  const wait = Math.max(0, minHostGapMs(host) - (Date.now() - last));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastByHost.set(host, Date.now());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const wiki = host.endsWith("wikipedia.org") || host.endsWith("wikimedia.org") || host.endsWith("wikidata.org");
  const news = host === "news.google.com" || (host.endsWith("bing.com") && url.includes("/news"));
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": userAgentFor(host),
        accept: wiki
          ? "application/json"
          : news
            ? "application/rss+xml, application/xml, text/xml, */*"
            : "text/html,application/json,text/csv,*/*",
        ...(wiki ? { "api-user-agent": USER_AGENT } : {}),
      },
    });
    const cap = options?.maxChars ?? fetchLimits(url).maxChars;
    const text = prepareFetchedText(await readBody(response, timeoutMs), cap);
    return { ok: response.ok, status: response.status, text, url: response.url || url };
  } catch (error) {
    return { ok: false, status: 0, text: "", failure: classifyFetchError(error) };
  } finally {
    clearTimeout(timer);
  }
}
