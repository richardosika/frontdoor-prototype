import { prisma } from "@/lib/prisma";
import { politeFetch } from "@/lib/verify/fetch";
import type { WatchlistEntry } from "@/lib/verify/checks";

const SDN_URL = "https://www.treasury.gov/ofac/downloads/sdn.csv";
const CACHE_KEY = "ofac-sdn";

export function parseSdnCsv(csv: string): WatchlistEntry[] {
  const rows = csv.split(/\r?\n/).slice(0, 12000);
  const entries: WatchlistEntry[] = [];
  for (const row of rows) {
    const columns = splitCsv(row);
    const name = (columns[1] || "").replace(/^"|"$/g, "").trim();
    const remarks = (columns[11] || "").replace(/^"|"$/g, "");
    if (name.length < 4) continue;
    const country = remarks.match(/\b(United States|Iran|Russia|China|Syria|North Korea|Cuba|Venezuela)\b/i)?.[0] || "";
    entries.push({ name, location: country });
    if (entries.length >= 8000) break;
  }
  return entries;
}

function splitCsv(row: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of row) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current);
  return out;
}

export async function loadWatchlist(): Promise<{ entries: WatchlistEntry[]; fetchedAt: Date | null }> {
  const cached = await prisma.sourceCache.findUnique({ where: { key: CACHE_KEY } });
  if (!cached) return { entries: [], fetchedAt: null };
  try {
    const entries = JSON.parse(cached.body) as WatchlistEntry[];
    return { entries: Array.isArray(entries) ? entries : [], fetchedAt: cached.fetchedAt };
  } catch {
    return { entries: [], fetchedAt: cached.fetchedAt };
  }
}

export async function refreshWatchlist(): Promise<{ count: number; fetchedAt: Date; error: string }> {
  const fetched = await politeFetch(SDN_URL, 20000);
  if (!fetched.ok || fetched.text.length < 1000) {
    return { count: 0, fetchedAt: new Date(), error: "OFAC SDN could not be downloaded. The previous cache was left in place." };
  }
  const entries = parseSdnCsv(fetched.text);
  const fetchedAt = new Date();
  await prisma.sourceCache.upsert({
    where: { key: CACHE_KEY },
    create: { key: CACHE_KEY, body: JSON.stringify(entries), fetchedAt },
    update: { body: JSON.stringify(entries), fetchedAt },
  });
  return { count: entries.length, fetchedAt, error: "" };
}
