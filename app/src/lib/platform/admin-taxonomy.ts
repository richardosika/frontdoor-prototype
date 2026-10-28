export const FIELD_CAP = 12;

export function slugifyLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function canAddField(activeCount: number, cap = FIELD_CAP): { ok: true } | { ok: false; reason: string } {
  if (activeCount >= cap) return { ok: false, reason: `This asset type already has ${cap} fields.` };
  return { ok: true };
}

export type ReadinessMember = {
  role: string;
  isTest: boolean;
  marketCodes: string[];
  assetSlugs: string[];
};

export type ReadinessCell = {
  marketCode: string;
  marketName: string;
  role: string;
  count: number;
  testCount: number;
  growing: boolean;
};

export function readinessGrid(input: {
  members: ReadinessMember[];
  markets: { code: string; name: string; focus: boolean }[];
  roles: string[];
  thinMin: number;
  focusOnly?: boolean;
}): ReadinessCell[] {
  const markets = input.focusOnly ? input.markets.filter((market) => market.focus) : input.markets;
  const cells: ReadinessCell[] = [];
  for (const market of markets) {
    for (const role of input.roles) {
      const rows = input.members.filter((member) => member.role === role && member.marketCodes.includes(market.code));
      const testCount = rows.filter((member) => member.isTest).length;
      const count = rows.length - testCount;
      cells.push({
        marketCode: market.code,
        marketName: market.name,
        role,
        count,
        testCount,
        growing: count < input.thinMin,
      });
    }
  }
  return cells;
}

export function assetCoverage(input: { members: ReadinessMember[]; assets: { slug: string; label: string }[] }): { slug: string; label: string; count: number; testCount: number }[] {
  return input.assets.map((asset) => {
    const rows = input.members.filter((member) => member.assetSlugs.includes(asset.slug));
    const testCount = rows.filter((member) => member.isTest).length;
    return { slug: asset.slug, label: asset.label, count: rows.length - testCount, testCount };
  });
}

export function auditMatches(row: { summary: string; action: string; targetType: string; targetUserId: string }, query: { q?: string; targetType?: string }): boolean {
  if (query.targetType && row.targetType !== query.targetType) return false;
  const q = (query.q || "").trim().toLowerCase();
  if (!q) return true;
  return `${row.summary} ${row.action} ${row.targetType} ${row.targetUserId}`.toLowerCase().includes(q);
}
