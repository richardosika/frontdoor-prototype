import { sendEmail } from "@/lib/email";
import { planLocationBackfill, homeBaseLabel } from "@/lib/platform/backfill";
import { legacyAssetSlugs } from "@/lib/platform/catalog";
import type { DirectoryPerson } from "@/lib/platform/directory";
import { planSavedSearchAlerts } from "@/lib/platform/alerts";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";
import { appBaseUrl } from "@/lib/url";

function toPerson(user: {
  id: string;
  role: string;
  name: string;
  initials: string;
  org: string;
  bio: string;
  location: string;
  markets: string;
  dealTypes: string;
  assetClasses: string;
  checkSize: string;
  lookingFor: string;
  offering: string;
  nationwide: boolean;
  homeCity: string;
  createdAt: Date;
  memberMarkets: { relation: string; market: { kind: string; code: string; stateCode: string } }[];
  assetFocus: { assetType: { slug: string } }[];
  specialties: { specialty: { slug: string } }[];
}): DirectoryPerson {
  const homeState = user.memberMarkets.find((row) => row.relation === "HOME" && row.market.kind === "STATE")?.market.code || planLocationBackfill(user).homeState;
  const homeMetro = user.memberMarkets.find((row) => row.relation === "HOME" && row.market.kind === "METRO")?.market.code || "";
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    initials: user.initials,
    org: user.org,
    bio: user.bio,
    location: user.location,
    markets: user.markets,
    dealTypes: user.dealTypes,
    assetClasses: user.assetClasses,
    checkSize: user.checkSize,
    lookingFor: user.lookingFor,
    offering: user.offering,
    nationwide: user.nationwide,
    homeCity: user.homeCity,
    homeState,
    homeMetro,
    operateStates: user.memberMarkets.filter((row) => row.relation === "OPERATES" && row.market.kind === "STATE").map((row) => row.market.code),
    operateMetros: user.memberMarkets.filter((row) => row.relation === "OPERATES" && row.market.kind === "METRO").map((row) => row.market.code),
    operateCounties: user.memberMarkets.filter((row) => row.relation === "OPERATES" && row.market.kind === "COUNTY").map((row) => row.market.code),
    assetSlugs: user.assetFocus.length ? user.assetFocus.map((row) => row.assetType.slug) : legacyAssetSlugs(user.assetClasses),
    specialtySlugs: user.specialties.map((row) => row.specialty.slug),
    verified: false,
    createdAt: user.createdAt,
    completeness: 0,
  };
}

/** Writes one Outbox notice per saved search that matches this member. Repeat matches are skipped. */
export async function dispatchSavedSearchAlerts(memberId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: memberId },
    include: {
      memberMarkets: { include: { market: true } },
      assetFocus: { include: { assetType: true } },
      specialties: { include: { specialty: true } },
    },
  });
  if (!user || user.status !== "ACTIVE") return 0;
  const filters = await prisma.savedFilter.findMany({
    where: { alert: true, surface: "network", userId: { not: memberId } },
    include: { alerts: { where: { memberId }, select: { id: true } }, user: { select: { email: true } } },
  });
  const member = toPerson(user);
  const planned = planSavedSearchAlerts({
    member,
    homeBase: homeBaseLabel({ homeCity: user.homeCity, homeState: member.homeState, location: user.location }),
    roleLabel: roleLabel(user.role),
    filters: filters.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      query: row.query,
      alreadySent: row.alerts.length > 0,
    })),
    hrefFor: (id) => `/members/${id}`,
  });
  const origin = await appBaseUrl();
  let sent = 0;
  for (const item of planned) {
    const owner = filters.find((row) => row.id === item.filterId);
    if (!owner) continue;
    await sendEmail({
      to: owner.user.email,
      subject: item.subject,
      text: item.text.replace(item.href, `${origin}${item.href}`),
    });
    await prisma.savedSearchAlert.create({ data: { savedFilterId: item.filterId, memberId } });
    await prisma.savedFilter.update({ where: { id: item.filterId }, data: { lastAlertedAt: new Date() } });
    sent += 1;
  }
  return sent;
}
