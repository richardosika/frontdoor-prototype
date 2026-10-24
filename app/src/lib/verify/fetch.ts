const USER_AGENT = "PrivateFloorClub/1.0 (verification; connect@privatefloorclub.com)";
const lastByHost = new Map<string, number>();

export async function politeFetch(url: string, timeoutMs = 8000): Promise<{ ok: boolean; status: number; text: string }> {
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
    const text = (await response.text()).slice(0, 180_000);
    return { ok: response.ok, status: response.status, text };
  } catch {
    return { ok: false, status: 0, text: "" };
  } finally {
    clearTimeout(timer);
  }
}
