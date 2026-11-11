/**
 * Nov 10 (Julia's minutes), Bids:
 * - Unit pricing is removed from every bid (old templates and old bids keep the data; it is never shown or asked).
 * - Exclusions and Assumptions & notes sit behind a "More details" button on a submitted estimate.
 * - "Update Bid": every submitted version is kept. The original plus up to 5 updates; the original shows by default.
 * - The Trade field on a subcontractor bid is a drop-down of the trades the sub chose when joining.
 */
import { parseTrades, tradeLabel } from "@/lib/trades";

export const RETIRED_BID_FIELDS: ReadonlySet<string> = new Set(["unitPricing"]);
export const MORE_DETAIL_FIELDS: ReadonlySet<string> = new Set(["exclusions", "assumptions"]);
export const MAX_BID_UPDATES = 5;
export const MAX_BID_VERSIONS = MAX_BID_UPDATES + 1;
export const BID_UPDATE_LIMIT_ERROR = "You can update a bid up to 5 times.";
export const TRADE_CHOICE_ERROR = "Choose one of your trades.";

export type Revision = { version: number; values: string; submittedAt: Date };

/** Whether another submitted version may be added. `versions` counts the original. */
export function canAddVersion(versions: number): boolean {
  return versions < MAX_BID_VERSIONS;
}

/** "Original" for version 1, then "Revision 1" to "Revision 5". English key; translate with tx. */
export function versionName(version: number): { key: "Original" | "Revision {n}"; n: number } {
  return version <= 1 ? { key: "Original", n: 0 } : { key: "Revision {n}", n: version - 1 };
}

/** The version to show: the one asked for (?v=) when it exists, otherwise the original (or lowest available version). */
export function pickVersion<T extends { version: number }>(revisions: T[], asked?: string | null): T | null {
  if (!revisions.length) return null;
  const n = Number(asked);
  const hit = asked?.trim() && Number.isInteger(n) ? revisions.find((r) => r.version === n) : undefined;
  return hit ?? revisions.find((r) => r.version === 1) ?? revisions.reduce((a, b) => (b.version < a.version ? b : a));
}

/**
 * Versions for a bid. Bids submitted before Nov 10 have no rows yet: their current values count as the original.
 */
export function versionsOf(bid: { values: string; submittedAt: Date | null; status: string }, rows: Revision[]): Revision[] {
  if (rows.length) return [...rows].sort((a, b) => a.version - b.version);
  if (bid.status === "DRAFT" || !bid.submittedAt) return [];
  return [{ version: 1, values: bid.values, submittedAt: bid.submittedAt }];
}

/** Trade choices for a subcontractor's bid: the trades they chose when joining, as shown labels. */
export function tradeChoices(trades: string | null | undefined): string[] {
  return parseTrades(trades).map((id) => tradeLabel(id));
}

/** The submitted trade must be one of the sub's trades (when they have any on file). */
export function tradeChoiceOk(value: unknown, trades: string | null | undefined): boolean {
  const choices = tradeChoices(trades);
  if (!choices.length) return true;
  return choices.includes(String(value ?? ""));
}
