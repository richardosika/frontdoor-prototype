-- Member platform P0/P1. Additive only.
-- Apply on a deploy with: cd app && npx prisma migrate deploy && npm run db:seed-platform
-- Do not point DATABASE_URL at the live test site while that site is still on the mvp build.
-- This file does not change verification cases, applications, or payments.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "nationwide" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "homeCity" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "User_status_role_idx" ON "User"("status", "role");

-- AlterTable
ALTER TABLE "SavedFilter" ADD COLUMN "alert" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SavedFilter" ADD COLUMN "lastAlertedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "SavedFilter_alert_surface_idx" ON "SavedFilter"("alert", "surface");

-- CreateEnum
CREATE TYPE "MarketKind" AS ENUM ('STATE', 'METRO', 'COUNTY');
CREATE TYPE "MarketTier" AS ENUM ('SEEDING', 'ACTIVE');
CREATE TYPE "MarketRelation" AS ENUM ('HOME', 'OPERATES', 'INTERESTED');
CREATE TYPE "FieldKind" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTISELECT');
CREATE TYPE "FieldScope" AS ENUM ('PROFILE', 'DEAL', 'PROJECT', 'VENDOR');
CREATE TYPE "FieldAudience" AS ENUM ('MEMBERS', 'DEAL_TEAM', 'ADMIN');
CREATE TYPE "FocusStance" AS ENUM ('DEVELOPS', 'OPERATES', 'SERVES', 'INVESTS', 'LENDS');
CREATE TYPE "Audience" AS ENUM ('MEMBERS', 'CONNECTIONS', 'DEAL_TEAM', 'PRIVATE');

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "kind" "MarketKind" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL DEFAULT '',
    "tier" "MarketTier" NOT NULL DEFAULT 'SEEDING',
    "focus" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketLink" (
    "ancestorId" TEXT NOT NULL,
    "descendantId" TEXT NOT NULL,
    CONSTRAINT "MarketLink_pkey" PRIMARY KEY ("ancestorId","descendantId")
);

-- CreateTable
CREATE TABLE "MemberMarket" (
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "relation" "MarketRelation" NOT NULL,
    CONSTRAINT "MemberMarket_pkey" PRIMARY KEY ("userId","marketId","relation")
);

-- CreateTable
CREATE TABLE "AssetType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "AssetType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetField" (
    "id" TEXT NOT NULL,
    "assetTypeId" TEXT,
    "scope" "FieldScope" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "FieldKind" NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "options" JSONB,
    "filterable" BOOLEAN NOT NULL DEFAULT false,
    "audience" "FieldAudience" NOT NULL DEFAULT 'MEMBERS',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "AssetField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberAssetFocus" (
    "userId" TEXT NOT NULL,
    "assetTypeId" TEXT NOT NULL,
    "stance" "FocusStance" NOT NULL,
    "details" JSONB,
    CONSTRAINT "MemberAssetFocus_pkey" PRIMARY KEY ("userId","assetTypeId","stance")
);

-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "forRoles" "MemberRole"[],
    "assetTypeId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberSpecialty" (
    "userId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    CONSTRAINT "MemberSpecialty_pkey" PRIMARY KEY ("userId","specialtyId")
);

-- CreateTable
CREATE TABLE "ProfileFieldSetting" (
    "userId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "audience" "Audience" NOT NULL,
    CONSTRAINT "ProfileFieldSetting_pkey" PRIMARY KEY ("userId","fieldKey")
);

-- CreateTable
CREATE TABLE "SavedSearchAlert" (
    "id" TEXT NOT NULL,
    "savedFilterId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedSearchAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Market_kind_code_key" ON "Market"("kind", "code");
CREATE INDEX "Market_kind_stateCode_idx" ON "Market"("kind", "stateCode");
CREATE INDEX "Market_active_kind_idx" ON "Market"("active", "kind");
CREATE INDEX "MarketLink_descendantId_idx" ON "MarketLink"("descendantId");
CREATE INDEX "MemberMarket_marketId_relation_idx" ON "MemberMarket"("marketId", "relation");
CREATE UNIQUE INDEX "AssetType_slug_key" ON "AssetType"("slug");
CREATE INDEX "AssetType_parentId_active_idx" ON "AssetType"("parentId", "active");
CREATE INDEX "AssetField_assetTypeId_scope_idx" ON "AssetField"("assetTypeId", "scope");
CREATE INDEX "AssetField_filterable_active_idx" ON "AssetField"("filterable", "active");
CREATE INDEX "MemberAssetFocus_assetTypeId_stance_idx" ON "MemberAssetFocus"("assetTypeId", "stance");
CREATE INDEX "MemberAssetFocus_details_gin" ON "MemberAssetFocus" USING GIN ("details");
CREATE UNIQUE INDEX "Specialty_slug_key" ON "Specialty"("slug");
CREATE INDEX "Specialty_active_idx" ON "Specialty"("active");
CREATE INDEX "MemberSpecialty_specialtyId_idx" ON "MemberSpecialty"("specialtyId");
CREATE UNIQUE INDEX "SavedSearchAlert_savedFilterId_memberId_key" ON "SavedSearchAlert"("savedFilterId", "memberId");
CREATE INDEX "SavedSearchAlert_memberId_idx" ON "SavedSearchAlert"("memberId");

-- AddForeignKey
ALTER TABLE "MarketLink" ADD CONSTRAINT "MarketLink_ancestorId_fkey" FOREIGN KEY ("ancestorId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketLink" ADD CONSTRAINT "MarketLink_descendantId_fkey" FOREIGN KEY ("descendantId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberMarket" ADD CONSTRAINT "MemberMarket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberMarket" ADD CONSTRAINT "MemberMarket_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetType" ADD CONSTRAINT "AssetType_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AssetType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetField" ADD CONSTRAINT "AssetField_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberAssetFocus" ADD CONSTRAINT "MemberAssetFocus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberAssetFocus" ADD CONSTRAINT "MemberAssetFocus_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Specialty" ADD CONSTRAINT "Specialty_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "AssetType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberSpecialty" ADD CONSTRAINT "MemberSpecialty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberSpecialty" ADD CONSTRAINT "MemberSpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileFieldSetting" ADD CONSTRAINT "ProfileFieldSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedSearchAlert" ADD CONSTRAINT "SavedSearchAlert_savedFilterId_fkey" FOREIGN KEY ("savedFilterId") REFERENCES "SavedFilter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
