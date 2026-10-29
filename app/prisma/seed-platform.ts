/**
 * Loads markets, asset types, fields, specialties, backfills free-text locations, and adds TEST members.
 *
 * Local or a database you name with PLATFORM_SEED_OK=1.
 * Refuses a Render host so the live test site is left alone.
 *
 *   cd app && npx prisma migrate deploy && npm run db:seed-platform
 *
 * Cleanup: npm run db:cleanup-platform -- --delete
 * After that cleanup, the mvp baseline can be restored if these TEST rows were the only additions:
 * Members 19, Applications 2, CRM 2 pending / 19 approved, Outbox 12, Verification 37.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultStance, planLocationBackfill } from "../src/lib/platform/backfill";
import {
  ASSET_FIELDS,
  ASSET_TYPES,
  BASELINE_CENSUS,
  COUNTIES,
  METROS,
  PLATFORM_TEST_EMAIL_DOMAIN,
  SPECIALTIES,
  closureLinks,
  legacyAssetSlugs,
  stateSeeds,
} from "../src/lib/platform/catalog";
import { PLATFORM_TEST_MEMBERS } from "../src/lib/platform/roster";

const prisma = new PrismaClient();

function assertSafeDatabase() {
  const url = process.env.DATABASE_URL || "";
  if (/onrender\.com|render\.com/i.test(url)) {
    throw new Error("Refusing to change a Render database from this script.");
  }
  const local = /localhost|127\.0\.0\.1/.test(url);
  if (!local && process.env.PLATFORM_SEED_OK !== "1") {
    throw new Error("Set PLATFORM_SEED_OK=1 to seed a database that is not on localhost. This does not deploy.");
  }
}

async function main() {
  assertSafeDatabase();
  const stateIds = new Map<string, string>();
  for (const state of stateSeeds()) {
    const row = await prisma.market.upsert({
      where: { kind_code: { kind: "STATE", code: state.code } },
      create: { kind: "STATE", code: state.code, name: state.name, stateCode: state.code, tier: "SEEDING" },
      update: { name: state.name, stateCode: state.code, active: true },
    });
    stateIds.set(state.code, row.id);
  }
  const metroIds = new Map<string, string>();
  for (const metro of METROS) {
    const row = await prisma.market.upsert({
      where: { kind_code: { kind: "METRO", code: metro.code } },
      create: { kind: "METRO", code: metro.code, name: metro.name, stateCode: metro.states[0] || "", tier: "SEEDING" },
      update: { name: metro.name, stateCode: metro.states[0] || "", active: true },
    });
    metroIds.set(metro.code, row.id);
  }
  const countyIds = new Map<string, string>();
  for (const county of COUNTIES) {
    const row = await prisma.market.upsert({
      where: { kind_code: { kind: "COUNTY", code: county.fips } },
      create: { kind: "COUNTY", code: county.fips, name: county.name, stateCode: county.state, tier: "SEEDING" },
      update: { name: county.name, stateCode: county.state, active: true },
    });
    countyIds.set(county.fips, row.id);
  }
  for (const link of closureLinks()) {
    const ancestorId = link.ancestorKind === "STATE" ? stateIds.get(link.ancestorCode) : metroIds.get(link.ancestorCode);
    const descendantId = link.descendantKind === "METRO" ? metroIds.get(link.descendantCode) : countyIds.get(link.descendantCode);
    if (!ancestorId || !descendantId) continue;
    await prisma.marketLink.upsert({
      where: { ancestorId_descendantId: { ancestorId, descendantId } },
      create: { ancestorId, descendantId },
      update: {},
    });
  }

  const assetIds = new Map<string, string>();
  for (const asset of ASSET_TYPES.filter((item) => !item.parentSlug)) {
    const row = await prisma.assetType.upsert({
      where: { slug: asset.slug },
      create: { slug: asset.slug, label: asset.label, sortOrder: asset.sortOrder },
      update: { label: asset.label, sortOrder: asset.sortOrder, active: true },
    });
    assetIds.set(asset.slug, row.id);
  }
  for (const asset of ASSET_TYPES.filter((item) => item.parentSlug)) {
    const row = await prisma.assetType.upsert({
      where: { slug: asset.slug },
      create: { slug: asset.slug, label: asset.label, sortOrder: asset.sortOrder, parentId: assetIds.get(asset.parentSlug || "") },
      update: { label: asset.label, sortOrder: asset.sortOrder, parentId: assetIds.get(asset.parentSlug || ""), active: true },
    });
    assetIds.set(asset.slug, row.id);
  }
  for (const field of ASSET_FIELDS) {
    const assetTypeId = field.assetSlug ? assetIds.get(field.assetSlug) ?? null : null;
    const existing = await prisma.assetField.findFirst({ where: { key: field.key, assetTypeId } });
    const data = {
      assetTypeId,
      scope: field.scope,
      key: field.key,
      label: field.label,
      kind: field.kind,
      unit: field.unit || "",
      options: field.options ?? undefined,
      filterable: Boolean(field.filterable),
      sortOrder: field.sortOrder,
      active: true,
    };
    if (existing) await prisma.assetField.update({ where: { id: existing.id }, data });
    else await prisma.assetField.create({ data });
  }
  for (const specialty of SPECIALTIES) {
    await prisma.specialty.upsert({
      where: { slug: specialty.slug },
      create: {
        slug: specialty.slug,
        label: specialty.label,
        forRoles: specialty.roles,
        assetTypeId: specialty.assetSlug ? assetIds.get(specialty.assetSlug) : null,
      },
      update: {
        label: specialty.label,
        forRoles: specialty.roles,
        assetTypeId: specialty.assetSlug ? assetIds.get(specialty.assetSlug) : null,
        active: true,
      },
    });
  }

  const users = await prisma.user.findMany({
    select: { id: true, location: true, markets: true, assetClasses: true, role: true, memberMarkets: { select: { userId: true } } },
  });
  let backfilled = 0;
  for (const user of users) {
    if (user.memberMarkets.length) continue;
    const plan = planLocationBackfill(user);
    const rows: { userId: string; marketId: string; relation: "HOME" | "OPERATES" }[] = [];
    if (plan.homeState && stateIds.get(plan.homeState)) rows.push({ userId: user.id, marketId: stateIds.get(plan.homeState)!, relation: "HOME" });
    if (plan.homeMetro && metroIds.get(plan.homeMetro)) rows.push({ userId: user.id, marketId: metroIds.get(plan.homeMetro)!, relation: "HOME" });
    for (const code of plan.operateStates) {
      const id = stateIds.get(code);
      if (id) rows.push({ userId: user.id, marketId: id, relation: "OPERATES" });
    }
    if (rows.length) {
      await prisma.memberMarket.createMany({ data: rows, skipDuplicates: true });
      backfilled += 1;
    }
    if (plan.homeCity || plan.nationwide) {
      await prisma.user.update({
        where: { id: user.id },
        data: { homeCity: plan.homeCity, nationwide: plan.nationwide },
      });
    }
    const slugs = legacyAssetSlugs(user.assetClasses);
    const stance = defaultStance(user.role);
    for (const slug of slugs) {
      const assetTypeId = assetIds.get(slug);
      if (!assetTypeId) continue;
      await prisma.memberAssetFocus.upsert({
        where: { userId_assetTypeId_stance: { userId: user.id, assetTypeId, stance } },
        create: { userId: user.id, assetTypeId, stance },
        update: {},
      });
    }
  }

  const passwordHash = bcrypt.hashSync("cornicio-demo", 10);
  let testMembers = 0;
  for (const member of PLATFORM_TEST_MEMBERS) {
    const user = await prisma.user.upsert({
      where: { email: member.email },
      create: {
        email: member.email,
        passwordHash,
        name: member.name,
        initials: member.initials,
        role: member.role,
        org: member.org,
        location: member.location,
        homeCity: member.homeCity,
        nationwide: member.nationwide,
        bio: member.bio,
        markets: member.operateStates.join(", "),
        assetClasses: member.assetSlug,
        checkSize: member.checkSize,
        isTest: true,
        status: "ACTIVE",
        paymentStatus: "NOT_REQUIRED",
      },
      update: {
        name: member.name,
        org: member.org,
        location: member.location,
        homeCity: member.homeCity,
        nationwide: member.nationwide,
        bio: member.bio,
        isTest: true,
        status: "ACTIVE",
      },
    });
    await prisma.memberMarket.deleteMany({ where: { userId: user.id } });
    const links: { userId: string; marketId: string; relation: "HOME" | "OPERATES" }[] = [];
    const homeState = stateIds.get(member.homeState);
    const homeMetro = metroIds.get(member.homeMetro);
    if (homeState) links.push({ userId: user.id, marketId: homeState, relation: "HOME" });
    if (homeMetro) links.push({ userId: user.id, marketId: homeMetro, relation: "HOME" });
    for (const code of member.operateStates) {
      const id = stateIds.get(code);
      if (id) links.push({ userId: user.id, marketId: id, relation: "OPERATES" });
    }
    if (links.length) await prisma.memberMarket.createMany({ data: links });
    const assetTypeId = assetIds.get(member.assetSlug);
    if (assetTypeId) {
      const stance = defaultStance(member.role);
      await prisma.memberAssetFocus.upsert({
        where: { userId_assetTypeId_stance: { userId: user.id, assetTypeId, stance } },
        create: { userId: user.id, assetTypeId, stance },
        update: {},
      });
    }
    if (member.specialtySlug) {
      const specialty = await prisma.specialty.findUnique({ where: { slug: member.specialtySlug } });
      if (specialty) {
        await prisma.memberSpecialty.upsert({
          where: { userId_specialtyId: { userId: user.id, specialtyId: specialty.id } },
          create: { userId: user.id, specialtyId: specialty.id },
          update: {},
        });
      }
    }
    testMembers += 1;
  }

  console.log(
    `Platform catalog ready. States ${stateIds.size}, metros ${metroIds.size}, counties ${countyIds.size}, backfilled ${backfilled}, TEST members ${testMembers} @${PLATFORM_TEST_EMAIL_DOMAIN}.`,
  );
  console.log(
    `Baseline to restore after cleanup: members ${BASELINE_CENSUS.members}, applications ${BASELINE_CENSUS.applications}, CRM pending ${BASELINE_CENSUS.crmPending} / approved ${BASELINE_CENSUS.crmApproved}, outbox ${BASELINE_CENSUS.outbox}, verification ${BASELINE_CENSUS.verification}.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Platform seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
