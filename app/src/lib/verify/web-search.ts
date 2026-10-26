import { nameTokens, normalizeName } from "@/lib/verify/fuzzy";
import type { ApplicantFacts, CheckOutput } from "@/lib/verify/types";

const NEGATIVE = /\b(fraud|lawsuit|indicted|scam|ponzi)\b/i;

export function duckDuckGoResultTexts(html: string): string[] {
  const withoutChrome = html
    .replace(/<title[\s\S]*?<\/title>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ");
  const chunks = [...withoutChrome.matchAll(/class="result__(?:a|snippet|extras__url)"[^>]*>([\s\S]*?)<\/a>/gi)];
  return chunks.map((match) => stripTags(match[1])).map((text) => text.trim()).filter((text) => text.length > 2);
}

export function bingResultTexts(html: string): string[] {
  const blocks = [...html.matchAll(/<li[^>]*class="[^"]*b_algo[^"]*"[\s\S]*?<\/li>/gi)];
  return blocks.map((match) => stripTags(match[0])).map((text) => text.trim()).filter((text) => text.length > 2);
}

export function wikipediaRestResultTexts(payload: string): string[] {
  try {
    const parsed = JSON.parse(payload) as { pages?: { title?: string; excerpt?: string; description?: string }[] };
    if (!Array.isArray(parsed.pages)) return [];
    return parsed.pages
      .map((row) => stripTags(`${row.title || ""} ${row.description || ""} ${row.excerpt || ""}`).trim())
      .filter((text) => text.length > 2);
  } catch {
    return [];
  }
}

export function wikipediaResultTexts(payload: string): string[] {
  try {
    const parsed = JSON.parse(payload) as { query?: { search?: { title?: string; snippet?: string }[] } };
    const rows = parsed.query?.search;
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => stripTags(`${row.title || ""} ${row.snippet || ""}`).trim())
      .filter((text) => text.length > 2);
  } catch {
    return [];
  }
}

export function wikidataResultTexts(payload: string): string[] {
  try {
    const parsed = JSON.parse(payload) as { search?: { label?: string; description?: string }[] };
    if (!Array.isArray(parsed.search)) return [];
    return parsed.search
      .map((row) => `${row.label || ""} ${row.description || ""}`.trim())
      .filter((text) => text.length > 2);
  } catch {
    return [];
  }
}

export function gdeltResultTexts(payload: string): string[] {
  try {
    const parsed = JSON.parse(payload) as { articles?: { title?: string; url?: string }[] };
    if (!Array.isArray(parsed.articles)) return [];
    return parsed.articles
      .map((row) => `${row.title || ""} ${row.url || ""}`.trim())
      .filter((text) => text.length > 2);
  } catch {
    return [];
  }
}

export function isQueryEcho(text: string, query: string): boolean {
  const hay = normalizeName(text);
  const asked = normalizeName(query);
  if (!hay || !asked) return false;
  if (hay === asked) return true;
  if (hay.includes("duckduckgo") && hay.includes(asked)) return true;
  return false;
}

export function mentionsPersonAndCompany(text: string, name: string, org: string): boolean {
  if (isQueryEcho(text, `"${name}" "${org}"`)) return false;
  const hay = normalizeName(text);
  const tokens = nameTokens(name);
  const orgPhrase = normalizeName(org);
  if (tokens.length < 2 || orgPhrase.length < 5) return false;
  return tokens.every((token) => new RegExp(`\\b${token}\\b`).test(hay)) && hay.includes(orgPhrase);
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Blocked or rate-limited responses are unavailable. An HTTP success with nothing parsed is no data. */
export function providerAttemptState(status: number, snippetCount: number): "unavailable" | "no-data" | "ready" {
  if (status === 0 || status === 202 || status === 401 || status === 403 || status === 429 || status === 999 || status >= 500) return "unavailable";
  if (snippetCount === 0) return "no-data";
  return "ready";
}

type FetchText = (url: string) => Promise<{ ok: boolean; status: number; text: string }>;

type Attempt = { provider: string; state: "unavailable" | "no-data" | "hit" | "negative"; sample: string; url: string };

export async function webFootprintCheck(facts: ApplicantFacts, fetchText: FetchText): Promise<CheckOutput> {
  const query = `"${facts.name}" "${facts.org}"`;
  const attempts: Attempt[] = [];
  const providers: { provider: string; url: string; parse: (text: string) => string[] }[] = [
    {
      provider: "DuckDuckGo",
      url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      parse: duckDuckGoResultTexts,
    },
    {
      provider: "Wikipedia",
      url: `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=8`,
      parse: wikipediaRestResultTexts,
    },
    {
      provider: "Wikidata",
      url: `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(`${facts.name} ${facts.org}`)}&language=en&format=json&limit=8`,
      parse: wikidataResultTexts,
    },
    {
      provider: "GDELT",
      url: `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`${facts.name} ${facts.org}`)}&mode=artlist&format=json&maxrecords=8`,
      parse: gdeltResultTexts,
    },
    {
      provider: "Bing",
      url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      parse: bingResultTexts,
    },
  ];

  for (const provider of providers) {
    let response: { ok: boolean; status: number; text: string };
    try {
      response = await fetchText(provider.url);
    } catch {
      response = { ok: false, status: 0, text: "" };
    }
    const snippets = response.status >= 200 && response.status < 300
      ? provider.parse(response.text).filter((text) => !isQueryEcho(text, query))
      : [];
    const state = providerAttemptState(response.status, snippets.length);
    if (state === "unavailable") {
      attempts.push({ provider: provider.provider, state: "unavailable", sample: "", url: provider.url });
      continue;
    }
    if (state === "no-data") {
      attempts.push({ provider: provider.provider, state: "no-data", sample: "", url: provider.url });
      continue;
    }
    const negative = snippets.find(
      (text) => mentionsPersonAndCompany(text, facts.name, facts.org) && NEGATIVE.test(text),
    );
    if (negative) {
      attempts.push({ provider: provider.provider, state: "negative", sample: negative.slice(0, 180), url: provider.url });
      break;
    }
    const hit = snippets.find((text) => mentionsPersonAndCompany(text, facts.name, facts.org));
    if (hit) {
      attempts.push({ provider: provider.provider, state: "hit", sample: hit.slice(0, 180), url: provider.url });
      break;
    }
    attempts.push({ provider: provider.provider, state: "no-data", sample: "", url: provider.url });
  }

  const hit = attempts.find((item) => item.state === "hit");
  const negative = attempts.find((item) => item.state === "negative");
  const responded = attempts.filter((item) => item.state === "no-data" || item.state === "hit" || item.state === "negative");
  const blocked = attempts.filter((item) => item.state === "unavailable").map((item) => item.provider);
  const ranAt = new Date().toISOString();
  if (negative) {
    return {
      key: "web-footprint",
      status: "INCONCLUSIVE",
      weight: 12,
      reviewFlag: true,
      finding: `Possible match, needs review. ${negative.provider} returned a result that names this person and company near a negative term. This is not a failure.`,
      source: negative.provider,
      url: negative.url,
      ranAt,
    };
  }
  if (hit) {
    return {
      key: "web-footprint",
      status: "PASS",
      weight: 12,
      corroborates: true,
      finding: `${hit.provider} returned a result that names both the person and the company. Query-echo titles were ignored.`,
      source: hit.provider,
      url: hit.url,
      ranAt,
    };
  }
  if (responded.length === 0) {
    return {
      key: "web-footprint",
      status: "UNAVAILABLE",
      weight: 12,
      finding: `Web search could not be checked. ${blocked.join(", ") || "Every provider"} was blocked, empty, or timed out.`,
      source: blocked.join(", ") || "Web search",
      url: attempts[0]?.url || "",
      ranAt,
    };
  }
  const empty = responded.map((item) => item.provider).join(", ");
  const blockedNote = blocked.length ? ` Unavailable: ${blocked.join(", ")}.` : "";
  return {
    key: "web-footprint",
    status: "INCONCLUSIVE",
    weight: 12,
    finding: `No data found. ${empty} responded, and none of the result text named both the person and the company.${blockedNote}`,
    source: empty,
    url: responded[0]?.url || "",
    ranAt,
  };
}
