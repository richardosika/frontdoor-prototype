-- CreateEnum
CREATE TYPE "ProjectReview" AS ENUM ('PENDING_REVIEW', 'NEEDS_INFO', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ProjectContactStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "TrackProject" ADD COLUMN     "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "reviewNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "reviewStatus" "ProjectReview" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "role" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "seeking" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shareWithCircle" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "state" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "street" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ProjectContact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "status" "ProjectContactStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectContact_toId_status_idx" ON "ProjectContact"("toId", "status");

-- CreateIndex
CREATE INDEX "ProjectContact_fromId_idx" ON "ProjectContact"("fromId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectContact_projectId_fromId_toId_key" ON "ProjectContact"("projectId", "fromId", "toId");

-- CreateIndex
CREATE INDEX "TrackProject_reviewStatus_idx" ON "TrackProject"("reviewStatus");

-- AddForeignKey
ALTER TABLE "ProjectContact" ADD CONSTRAINT "ProjectContact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TrackProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContact" ADD CONSTRAINT "ProjectContact_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContact" ADD CONSTRAINT "ProjectContact_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

