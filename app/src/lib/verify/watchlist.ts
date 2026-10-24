import { prisma } from "@/lib/prisma";
import { politeFetch } from "@/lib/verify/fetch";
import type { WatchlistEntry } from "@/lib/verify/checks";

const SDN_URL = "https://www.treasury.gov/ofac/downloads/sdn.csv";
const ALT_URL = "https://www.treasury.gov/ofac/downloads/alt.csv";
const CACHE_KEY = "ofac-sdn";
const DOWNLOAD_CAP = 20_000_000;

const COUNTRY =
  /\b(United States|Iran|Russia|China|Syria|North Korea|Cuba|Venezuela|Colombia|Mexico|Lebanon|Ukraine|Belarus|Iraq|Libya|Sudan|Somalia|Yemen|Afghanistan|Pakistan|Nicaragua)\b/i;

export function splitCsv(row: string): string[] {
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

function clean(value: string | undefined): string {
  return (value || "").replace(/^"|"$/g, "").trim();
}

/** Parse the whole SDN CSV, including names that sit past the first 180 KB. */
export function parseSdnCsv(csv: string): WatchlistEntry[] {
  return parseWatchlists(csv, "").filter((entry) => entry.aliasOf === undefined);
}

export function parseWatchlists(sdnCsv: string, altCsv = ""): WatchlistEntry[] {
  const entries: WatchlistEntry[] = [];
  const byEnt = new Map<string, { location: string; dob: string }>();
  for (const row of sdnCsv.split(/\r?\n/)) {
    if (!row.trim()) continue;
    const columns = splitCsv(row);
    const ent = clean(columns[0]);
    const name = clean(columns[1]);
    if (name.length < 4 || name === "-0-") continue;
    const remarks = clean(columns[11]);
    const location = remarks.match(COUNTRY)?.[0] || "";
    const dob = remarks.match(/DOB\s+([^;]+)/i)?.[1]?.trim() || "";
    entries.push({ name, location, dob });
    if (ent) byEnt.set(ent, { location, dob });
  }
  for (const row of altCsv.split(/\r?\n/)) {
    if (!row.trim()) continue;
    const columns = splitCsv(row);
    const ent = clean(columns[0]);
    const name = clean(columns[3]);
    if (name.length < 4) continue;
    const primary = byEnt.get(ent);
    entries.push({
      name,
      location: primary?.location || "",
      dob: primary?.dob || "",
      aliasOf: ent,
    });
  }
  return entries;
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
  const fetched = await politeFetch(SDN_URL, 45000, { maxChars: DOWNLOAD_CAP });
  if (!fetched.ok || fetched.text.length < 1000) {
    return { count: 0, fetchedAt: new Date(), error: "OFAC SDN could not be downloaded. The previous cache was left in place." };
  }
  const alt = await politeFetch(ALT_URL, 45000, { maxChars: DOWNLOAD_CAP });
  const entries = parseWatchlists(fetched.text, alt.ok ? alt.text : "");
  const fetchedAt = new Date();
  await prisma.sourceCache.upsert({
    where: { key: CACHE_KEY },
    create: { key: CACHE_KEY, body: JSON.stringify(entries), fetchedAt },
    update: { body: JSON.stringify(entries), fetchedAt },
  });
  const altNote = alt.ok ? "" : " Alternate names could not be downloaded; primary names were cached.";
  return { count: entries.length, fetchedAt, error: altNote.trim() };
}
