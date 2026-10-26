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
 * Strip style, script, and head, then decode entities, then apply the size cap.
 * A 180KB head or stylesheet must not cut off the team-page text that follows it.
 */
export function prepareFetchedText(text: string, maxChars: number): string {
  if (!looksLikeHtml(text)) return limitText(text, maxChars);
  return limitText(decodeHtmlEntities(stripScriptsAndStyles(text)), maxChars);
}

/** Retry network failures, rate limits, and server errors. A normal 4xx, a challenge page, and NXDOMAIN are final. */
export function shouldRetryStatus(status: number): boolean {
  return status === 0 || status === 429 || status >= 500;
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
    const text = prepareFetchedText(await response.text(), cap);
    return { ok: response.ok, status: response.status, text, url: response.url || url };
  } catch (error) {
    return { ok: false, status: 0, text: "", failure: classifyFetchError(error) };
  } finally {
    clearTimeout(timer);
  }
}
