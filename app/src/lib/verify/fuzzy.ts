export function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function nameTokens(value: string): string[] {
  return normalizeName(value)
    .split(" ")
    .filter((token) => token.length > 1 && !["llc", "inc", "corp", "ltd", "co", "the"].includes(token));
}

/** Conservative name match. Exact token overlap scores highest. Extra tokens lower the score. */
export function nameMatchScore(left: string, right: string): number {
  const a = [...new Set(nameTokens(left))];
  const b = [...new Set(nameTokens(right))];
  if (a.length < 2 || b.length < 2) return 0;
  const sb = new Set(b);
  const inter = a.filter((token) => sb.has(token)).length;
  const cover = inter / Math.min(a.length, b.length);
  const jaccard = inter / (a.length + b.length - inter);
  const gap = Math.abs(a.length - b.length);
  if (gap > 1) return jaccard * 0.5;
  return (cover + jaccard) / 2;
}

export const SANCTIONS_MATCH_THRESHOLD = 0.92;

export function locationsCorroborate(applicantLocation: string, listLocation: string): boolean {
  const place = normalizeName(applicantLocation);
  const listed = normalizeName(listLocation);
  if (!place || !listed) return false;
  const tokens = listed.split(" ").filter((token) => token.length > 3);
  if (!tokens.length) return false;
  const hits = tokens.filter((token) => place.includes(token));
  return hits.length >= 1 && hits.join(" ").length >= 4;
}
