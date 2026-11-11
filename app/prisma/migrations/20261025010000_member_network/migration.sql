-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PUBLISHED', 'PENDING_REVIEW', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IntroductionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterEnum
ALTER TYPE "AccessStatus" ADD VALUE IF NOT EXISTS 'REMOVED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "website" TEXT NOT NULL DEFAULT '',
ADD COLUMN "markets" TEXT NOT NULL DEFAULT '',
ADD COLUMN "dealTypes" TEXT NOT NULL DEFAULT '',
ADD COLUMN "assetClasses" TEXT NOT NULL DEFAULT '',
ADD COLUMN "checkSize" TEXT NOT NULL DEFAULT '',
ADD COLUMN "lookingFor" TEXT NOT NULL DEFAULT '',
ADD COLUMN "offering" TEXT NOT NULL DEFAULT '',
ADD COLUMN "checklistDone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "notifyMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyIntros" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyDeals" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deletionRequestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "status" "PostStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN "intent" TEXT NOT NULL DEFAULT '',
ADD COLUMN "market" TEXT NOT NULL DEFAULT '',
ADD COLUMN "assetClass" TEXT NOT NULL DEFAULT '',
ADD COLUMN "sizeRange" TEXT NOT NULL DEFAULT '',
ADD COLUMN "rulesVersion" TEXT NOT NULL DEFAULT '',
ADD COLUMN "rulesAckAt" TIMESTAMP(3),
ADD COLUMN "flagReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "closedAt" TIMESTAMP(3),
ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DealAccess" ADD COLUMN "ndaVersion" TEXT NOT NULL DEFAULT '',
ADD COLUMN "ndaIpHash" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Connection" ADD COLUMN "note" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "DealDocument" ADD COLUMN "fileName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "contentType" TEXT NOT NULL DEFAULT '',
ADD COLUMN "sizeBytes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN "postId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "BusinessCard" ALTER COLUMN "applicationId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Introduction" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "status" "IntroductionStatus" NOT NULL DEFAULT 'PENDING',
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Introduction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Post_status_createdAt_idx" ON "Post"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Introduction_toId_status_idx" ON "Introduction"("toId", "status");

-- CreateIndex
CREATE INDEX "Introduction_fromId_createdAt_idx" ON "Introduction"("fromId", "createdAt");

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
