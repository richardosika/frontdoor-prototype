const USER_AGENT = "PrivateFloorClub/1.0 (verification; connect@privatefloorclub.com)";
const lastByHost = new Map<string, number>();

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
  const first = await fetchOnce(url, timeoutMs, options);
  if (!shouldRetryStatus(first.status)) return first;
  await new Promise((resolve) => setTimeout(resolve, 700));
  return fetchOnce(url, timeoutMs, options);
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
  const wait = Math.max(0, 1000 - (Date.now() - last));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastByHost.set(host, Date.now());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/json,text/csv,*/*" },
    });
    const text = limitText(await response.text(), options?.maxChars ?? 180_000);
    return { ok: response.ok, status: response.status, text };
  } catch {
    return { ok: false, status: 0, text: "" };
  } finally {
    clearTimeout(timer);
  }
}
