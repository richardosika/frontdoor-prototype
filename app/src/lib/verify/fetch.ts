export const USER_AGENT = "PrivateFloorClub/1.0 (verification; connect@privatefloorclub.com)";

/** Honest identifying agent for every host. Social sites that block it are not checkable for free. */
export function userAgentFor(host: string): string {
  void host;
  return USER_AGENT;
}
const lastByHost = new Map<string, number>();
const responseCache = new Map<string, { at: number; value: { ok: boolean; status: number; text: string } }>();
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
  try {
    host = new URL(url).host;
  } catch {
    return { timeoutMs: 8000, maxChars: 180_000 };
  }
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

/** Retry network failures, rate limits, and server errors once. A normal 4xx is final. */
export function shouldRetryStatus(status: number): boolean {
  return status === 0 || status === 429 || status >= 500;
}

export async function politeFetch(
  url: string,
  timeoutMs = 8000,
  options?: { maxChars?: number },
): Promise<{ ok: boolean; status: number; text: string }> {
  const timeout = Math.max(timeoutMs, fetchLimits(url).timeoutMs);
  if (cacheable(url)) {
    const cached = responseCache.get(url);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  }
  const first = await fetchOnce(url, timeout, options);
  if (!shouldRetryStatus(first.status)) {
    if (cacheable(url) && first.status >= 200 && first.status < 300) responseCache.set(url, { at: Date.now(), value: first });
    return first;
  }
  await new Promise((resolve) => setTimeout(resolve, retryDelayMs(url)));
  const second = await fetchOnce(url, timeout, options);
  if (cacheable(url) && second.status >= 200 && second.status < 300) responseCache.set(url, { at: Date.now(), value: second });
  return second;
}

async function fetchOnce(
  url: string,
  timeoutMs: number,
  options?: { maxChars?: number },
): Promise<{ ok: boolean; status: number; text: string }> {
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
    const text = limitText(await response.text(), cap);
    return { ok: response.ok, status: response.status, text };
  } catch {
    return { ok: false, status: 0, text: "" };
  } finally {
    clearTimeout(timer);
  }
}
