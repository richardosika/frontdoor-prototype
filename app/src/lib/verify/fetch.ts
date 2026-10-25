const USER_AGENT = "PrivateFloorClub/1.0 (verification; connect@privatefloorclub.com)";
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
    return new URL(url).host === "api.gdeltproject.org";
  } catch {
    return false;
  }
}

export function clearFetchCache(): void {
  responseCache.clear();
  lastByHost.clear();
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
  if (cacheable(url)) {
    const cached = responseCache.get(url);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  }
  const first = await fetchOnce(url, timeoutMs, options);
  if (!shouldRetryStatus(first.status)) {
    if (cacheable(url) && first.status >= 200 && first.status < 300) responseCache.set(url, { at: Date.now(), value: first });
    return first;
  }
  await new Promise((resolve) => setTimeout(resolve, retryDelayMs(url)));
  const second = await fetchOnce(url, timeoutMs, options);
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
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": USER_AGENT,
        accept: wiki ? "application/json" : "text/html,application/json,text/csv,*/*",
        ...(wiki ? { "api-user-agent": USER_AGENT } : {}),
      },
    });
    const text = limitText(await response.text(), options?.maxChars ?? 180_000);
    return { ok: response.ok, status: response.status, text };
  } catch {
    return { ok: false, status: 0, text: "" };
  } finally {
    clearTimeout(timer);
  }
}
