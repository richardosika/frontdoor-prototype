import type { Prisma } from "@prisma/client";
import { LISTED_PAYMENT_STATUSES } from "@/lib/payments";
import { countiesInMetro, metroByCode, slugsCoveredByFilter, ASSET_TYPES } from "@/lib/platform/catalog";
import type { DirectoryFilter } from "@/lib/platform/directory";
import { legacyStatePatterns, type LegacyStatePattern } from "@/lib/platform/state-codes";
import { ROLES } from "@/lib/roles";

function patternWhere(pattern: LegacyStatePattern): Prisma.UserWhereInput {
  const match = { [pattern.op]: pattern.value, mode: "insensitive" as const };
  return { [pattern.field]: match };
}

export function stateTextWhere(state: string): Prisma.UserWhereInput {
  return { OR: legacyStatePatterns(state).map(patternWhere) };
}

export function strictMarketWhere(filter: DirectoryFilter): Prisma.UserWhereInput | null {
  if (filter.metro) {
    const metro = metroByCode(filter.metro);
    const counties = countiesInMetro(filter.metro).map((item) => item.fips);
    const or: Prisma.UserWhereInput[] = [
      { memberMarkets: { some: { relation: { in: ["HOME", "OPERATES"] }, market: { kind: "METRO", code: filter.metro } } } },
    ];
    if (metro) {
      or.push({
        memberMarkets: { some: { relation: "OPERATES", market: { kind: "STATE", code: { in: metro.states } } } },
      });
      for (const state of metro.states) {
        or.push({ OR: legacyStatePatterns(state).filter((pattern) => pattern.field === "markets").map(patternWhere) });
        or.push({
          AND: [
            { OR: metro.cities.map((city) => ({ location: { contains: city, mode: "insensitive" as const } })) },
            stateTextWhere(state),
          ],
        });
      }
    }
    if (counties.length) {
      or.push({
        memberMarkets: { some: { relation: { in: ["HOME", "OPERATES"] }, market: { kind: "COUNTY", code: { in: counties } } } },
      });
    }
    return { OR: or };
  }
  if (filter.state) {
    const code = filter.state.toUpperCase();
    return {
      OR: [
        { memberMarkets: { some: { relation: { in: ["HOME", "OPERATES"] }, market: { OR: [{ kind: "STATE", code }, { kind: "METRO", stateCode: code }, { kind: "COUNTY", stateCode: code }] } } } },
        stateTextWhere(code),
      ],
    };
  }
  return null;
}

export function stateScopeWhere(filter: DirectoryFilter): Prisma.UserWhereInput | null {
  const states = filter.metro ? metroByCode(filter.metro)?.states ?? [] : filter.state ? [filter.state.toUpperCase()] : [];
  if (!states.length) return null;
  return {
    OR: [
      { memberMarkets: { some: { relation: { in: ["HOME", "OPERATES"] }, market: { stateCode: { in: states } } } } },
      { memberMarkets: { some: { relation: { in: ["HOME", "OPERATES"] }, market: { kind: "STATE", code: { in: states } } } } },
      ...states.map((state) => stateTextWhere(state)),
    ],
  };
}

function nicheWhere(filter: DirectoryFilter): Prisma.UserWhereInput[] {
  const and: Prisma.UserWhereInput[] = [];
  if (filter.role) and.push({ role: filter.role as Prisma.UserWhereInput["role"] });
  if (filter.group) {
    const ids = ROLES.filter((item) => item.group === filter.group).map((item) => item.id);
    and.push({ role: { in: ids } });
  }
  if (filter.specialty) and.push({ specialties: { some: { specialty: { slug: filter.specialty } } } });
  if (filter.asset) {
    const slugs = slugsCoveredByFilter(filter.asset);
    const labels = ASSET_TYPES.filter((item) => slugs.includes(item.slug)).map((item) => item.label);
    and.push({
      OR: [
        ...(slugs.length ? [{ assetFocus: { some: { assetType: { slug: { in: slugs } } } } }] : []),
        ...labels.map((label) => ({ assetClasses: { contains: label, mode: "insensitive" as const } })),
        { assetClasses: { contains: filter.asset, mode: "insensitive" as const } },
      ],
    });
  }
  const query = (filter.q ?? "").trim();
  if (query) {
    and.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { org: { contains: query, mode: "insensitive" } },
        { bio: { contains: query, mode: "insensitive" } },
      ],
    });
  }
  return and;
}

export function eligibleWhere(viewerId: string, filter: DirectoryFilter): Prisma.UserWhereInput {
  return {
    status: "ACTIVE",
    paymentStatus: { in: [...LISTED_PAYMENT_STATUSES] },
    id: { not: viewerId },
    NOT: {
      OR: [{ blocksMade: { some: { blockedId: viewerId } } }, { blocksReceived: { some: { blockerId: viewerId } } }],
    },
    AND: nicheWhere(filter),
  };
}

export function populationWhere(filter: DirectoryFilter): Prisma.UserWhereInput {
  const market = strictMarketWhere({ metro: filter.metro, state: filter.state, place: filter.place });
  const and: Prisma.UserWhereInput[] = [
    { status: "ACTIVE", paymentStatus: { in: [...LISTED_PAYMENT_STATUSES] } },
    ...nicheWhere({ role: filter.role, group: filter.group }),
  ];
  if (market) and.push(market);
  return { AND: and };
}

export function resultWhere(
  viewerId: string,
  filter: DirectoryFilter,
  widened: "none" | "state" | "nationwide",
): Prisma.UserWhereInput {
  const parts: Prisma.UserWhereInput[] = [eligibleWhere(viewerId, filter)];
  if (filter.metro || filter.state) {
    if (widened === "nationwide") {
      return { AND: parts };
    }
    const scope = widened === "state" ? stateScopeWhere(filter) : strictMarketWhere(filter);
    if (scope) {
      parts.push({ OR: [scope, { nationwide: true }] });
    }
  }
  return { AND: parts };
}

/** True when a state filter would use a bare two-letter contains. The directory must not. */
export function stateFilterUsesBareContains(state: string): boolean {
  return legacyStatePatterns(state).some((pattern) => pattern.op === "contains" && pattern.value.toUpperCase() === state.toUpperCase());
}
