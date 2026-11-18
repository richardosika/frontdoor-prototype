/** How a deal lines up with the markets, deal types and asset classes a member chose on their profile. */
export type MemberPrefs = { markets: string; dealTypes: string; assetClasses: string };
export type MatchableDeal = { market: string; assetClass: string; text: string };

function list(csv: string): string[] {
  return csv
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Two-letter state codes in a market line such as "Newark, NJ" or "NJ / NY". */
export function marketStates(market: string): string[] {
  return market.match(/\b[A-Z]{2}\b/g) || [];
}

/** The reasons a deal matches, in the order markets, asset classes, deal types. Empty means no match. */
export function dealMatchReasons(prefs: MemberPrefs, deal: MatchableDeal): string[] {
  const reasons: string[] = [];
  const states = new Set(marketStates(deal.market));
  const market = list(prefs.markets).find((state) => states.has(state.toUpperCase()));
  if (market) reasons.push(market);
  const asset = list(prefs.assetClasses).find((item) => item.toLowerCase() === deal.assetClass.trim().toLowerCase());
  if (asset) reasons.push(asset);
  const text = deal.text.toLowerCase();
  const type = list(prefs.dealTypes).find((item) => new RegExp(`\\b${item.toLowerCase().replace(/[^a-z0-9]/g, "")}\\b`).test(text));
  if (type) reasons.push(type);
  return reasons;
}

/** True once the member has said anything about what they want to see. */
export function hasPrefs(prefs: MemberPrefs): boolean {
  return Boolean(list(prefs.markets).length || list(prefs.dealTypes).length || list(prefs.assetClasses).length);
}

/**
 * Deals for the top of the Ledger. Matching deals first, best match first, newest first within a score.
 * When nothing matches, the most recent deals, flagged as a fallback.
 */
export function pickLeadDeals<T extends { deal: MatchableDeal; createdAt: Date }>(
  prefs: MemberPrefs,
  items: T[],
  limit = 3,
): { matched: boolean; items: Array<T & { reasons: string[] }> } {
  const scored = items.map((item) => ({ ...item, reasons: dealMatchReasons(prefs, item.deal) }));
  const newest = (a: { createdAt: Date }, b: { createdAt: Date }) => b.createdAt.getTime() - a.createdAt.getTime();
  const hits = scored.filter((item) => item.reasons.length > 0).sort((a, b) => b.reasons.length - a.reasons.length || newest(a, b));
  if (hits.length) return { matched: true, items: hits.slice(0, limit) };
  return { matched: false, items: scored.sort(newest).slice(0, limit) };
}
