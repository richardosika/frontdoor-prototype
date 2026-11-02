/**
 * Recommended connections: members who share the viewer's area, fill a category their projects seek, or work on the
 * same project types. Every card shows why. Everything stays online inside Private Floor.
 */
import { memberCategories, parseSeeking, seekLabel } from "@/lib/project-contact";
import { isDeveloperRole } from "@/lib/member-reach";

export type RecMember = {
  id: string;
  role: string;
  location: string;
  markets: string;
  assetClasses: string;
  extraCategories?: string;
};

export type Reason = { kind: "location" | "category" | "projectType"; text: string; value: string };

const split = (value: string) =>
  value
    .split(/[,;\n|]/)
    .map((part) => part.trim())
    .filter(Boolean);

/** "Austin, TX" → "TX". */
export function stateOf(location: string): string {
  const last = location.split(",").map((p) => p.trim()).filter(Boolean).pop() ?? "";
  const code = last.toUpperCase().match(/\b[A-Z]{2}\b/)?.[0];
  return code ?? last;
}

export function recommendReasons(viewer: RecMember & { seeking: string[] }, other: RecMember): Reason[] {
  const reasons: Reason[] = [];
  const vState = stateOf(viewer.location);
  const oState = stateOf(other.location);
  const vMarkets = new Set(split(viewer.markets).map((m) => m.toLowerCase()));
  const sharedMarket = split(other.markets).find((m) => vMarkets.has(m.toLowerCase()));
  if (vState && vState === oState) reasons.push({ kind: "location", text: "Same area", value: other.location });
  else if (sharedMarket) reasons.push({ kind: "location", text: "Same market", value: sharedMarket });
  const theirCategories = memberCategories(other);
  const sought = theirCategories.find((c) => viewer.seeking.includes(c));
  if (sought) reasons.push({ kind: "category", text: "Your projects seek", value: seekLabel(sought) });
  else if (!isDeveloperRole(viewer.role) && isDeveloperRole(other.role)) reasons.push({ kind: "category", text: "Developer", value: "" });
  const vTypes = new Set(split(viewer.assetClasses).map((a) => a.toLowerCase()));
  const sharedType = split(other.assetClasses).find((a) => vTypes.has(a.toLowerCase()));
  if (sharedType) reasons.push({ kind: "projectType", text: "Same project type", value: sharedType });
  return reasons;
}

const WEIGHT: Record<Reason["kind"], number> = { category: 3, location: 2, projectType: 1 };

/** Top matches, best first. A match needs the same area or market, or a category the viewer's projects seek. */
export function recommend(viewer: RecMember & { seeking: string[] }, others: RecMember[], exclude: Set<string>, limit = 6) {
  return others
    .filter((other) => other.id !== viewer.id && !exclude.has(other.id))
    .map((other) => {
      const reasons = recommendReasons(viewer, other);
      return { id: other.id, reasons, score: reasons.reduce((sum, r) => sum + WEIGHT[r.kind], 0) };
    })
    .filter((row) => row.score >= 2)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export { parseSeeking };
