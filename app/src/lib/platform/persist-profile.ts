import type { Prisma } from "@prisma/client";
import type { ProfileFormPlan } from "@/lib/platform/profile-form";
import { prisma } from "@/lib/prisma";

/** Writes home base, operating markets, asset focus, specialties, and field visibility. Legacy text columns stay. */
export async function persistStructuredProfile(userId: string, plan: ProfileFormPlan): Promise<{ structured: boolean }> {
  const stateCodes = [...new Set([plan.homeState, ...plan.operateStates].filter(Boolean))];
  const metroCodes = [...new Set([plan.homeMetro, ...plan.operateMetros].filter(Boolean))];
  const [markets, assetTypes, specialties] = await Promise.all([
    stateCodes.length || metroCodes.length
      ? prisma.market.findMany({
          where: {
            OR: [
              ...(stateCodes.length ? [{ kind: "STATE" as const, code: { in: stateCodes } }] : []),
              ...(metroCodes.length ? [{ kind: "METRO" as const, code: { in: metroCodes } }] : []),
            ],
          },
        })
      : Promise.resolve([]),
    plan.assets.length
      ? prisma.assetType.findMany({ where: { slug: { in: plan.assets.map((item) => item.slug) }, active: true } })
      : Promise.resolve([]),
    plan.specialties.length
      ? prisma.specialty.findMany({ where: { slug: { in: plan.specialties }, active: true } })
      : Promise.resolve([]),
  ]);
  const wantedMarkets = stateCodes.length + metroCodes.length;
  if (wantedMarkets > 0 && markets.length === 0) return { structured: false };

  const marketId = new Map(markets.map((row) => [`${row.kind}:${row.code}`, row.id]));
  const memberMarkets: Prisma.MemberMarketCreateManyInput[] = [];
  const homeStateId = plan.homeState ? marketId.get(`STATE:${plan.homeState}`) : undefined;
  const homeMetroId = plan.homeMetro ? marketId.get(`METRO:${plan.homeMetro}`) : undefined;
  if (homeStateId) memberMarkets.push({ userId, marketId: homeStateId, relation: "HOME" });
  if (homeMetroId) memberMarkets.push({ userId, marketId: homeMetroId, relation: "HOME" });
  for (const code of plan.operateStates) {
    const id = marketId.get(`STATE:${code}`);
    if (id) memberMarkets.push({ userId, marketId: id, relation: "OPERATES" });
  }
  for (const code of plan.operateMetros) {
    const id = marketId.get(`METRO:${code}`);
    if (id) memberMarkets.push({ userId, marketId: id, relation: "OPERATES" });
  }
  const assetId = new Map(assetTypes.map((row) => [row.slug, row.id]));
  const focus: Prisma.MemberAssetFocusCreateManyInput[] = [];
  for (const asset of plan.assets) {
    const id = assetId.get(asset.slug);
    if (id) focus.push({ userId, assetTypeId: id, stance: asset.stance });
  }
  const specialtyId = new Map(specialties.map((row) => [row.slug, row.id]));
  const specialtyRows = plan.specialties.flatMap((slug) => {
    const id = specialtyId.get(slug);
    return id ? [{ userId, specialtyId: id }] : [];
  });

  await prisma.$transaction([
    prisma.memberMarket.deleteMany({ where: { userId } }),
    ...(memberMarkets.length ? [prisma.memberMarket.createMany({ data: memberMarkets })] : []),
    prisma.memberAssetFocus.deleteMany({ where: { userId } }),
    ...(focus.length ? [prisma.memberAssetFocus.createMany({ data: focus })] : []),
    prisma.memberSpecialty.deleteMany({ where: { userId } }),
    ...(specialtyRows.length ? [prisma.memberSpecialty.createMany({ data: specialtyRows })] : []),
    ...(["lookingFor", "offering", "checkSize"] as const).map((fieldKey) =>
      prisma.profileFieldSetting.upsert({
        where: { userId_fieldKey: { userId, fieldKey } },
        create: { userId, fieldKey, audience: plan.audiences[fieldKey] },
        update: { audience: plan.audiences[fieldKey] },
      }),
    ),
  ]);
  return { structured: true };
}
