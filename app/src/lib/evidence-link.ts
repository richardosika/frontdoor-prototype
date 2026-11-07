/** CourtListener evidence is stored as the JSON search API. The review screen opens the public search page. */
export function publicEvidenceHref(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if ((host === "www.courtlistener.com" || host === "courtlistener.com") && parsed.pathname.includes("/api/")) {
      const human = new URL("https://www.courtlistener.com/");
      const query = parsed.searchParams.get("q");
      const type = parsed.searchParams.get("type") || "o";
      if (query) human.searchParams.set("q", query);
      if (type) human.searchParams.set("type", type);
      return human.toString();
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}
