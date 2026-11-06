/**
 * Nov 6: category drop-downs in A–Z order of the label the member actually sees (Spanish, German and Japanese sort
 * in their own language). "Other …" catch-alls such as Other Deal Professionals stay at the end.
 */
const LAST = new Set(["OTHER_PROFESSIONAL", "OTHER_DEAL_PROFESSIONALS", "Other Deal Professionals", "OTHER"]);

export function sortByShownLabel<T>(items: readonly T[], shown: (item: T) => string, locale: string, key?: (item: T) => string): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const last = (item: T) => (LAST.has(key ? key(item) : "") || LAST.has(shown(item)) ? 1 : 0);
  return [...items].sort((a, b) => last(a) - last(b) || collator.compare(shown(a), shown(b)));
}
