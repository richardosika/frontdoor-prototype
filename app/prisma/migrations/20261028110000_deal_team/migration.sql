-- Deal team workspace (P4). Additive.
-- Apply with: cd app && npx prisma migrate deploy
-- Do not point DATABASE_URL at the live test site.

CREATE TYPE "TeamStatus" AS ENUM ('REQUESTED', 'ADDED', 'DECLINED', 'REMOVED');
CREATE TYPE "TeamRole" AS ENUM ('SPONSOR', 'LENDER', 'INVESTOR', 'GC', 'DESIGN', 'ATTORNEY', 'BROKER', 'ADVISOR', 'OTHER');

CREATE TABLE "DealTeamMember" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamRole" "TeamRole" NOT NULL DEFAULT 'OTHER',
    "status" "TeamStatus" NOT NULL DEFAULT 'REQUESTED',
    "addedBySponsor" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',
    "ndaVersion" TEXT NOT NULL DEFAULT '',
    "ndaAckAt" TIMESTAMP(3),
    "ndaIpHash" TEXT NOT NULL DEFAULT '',
    "addedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DealTeamMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DealTeamMember_dealId_userId_key" ON "DealTeamMember"("dealId", "userId");
CREATE INDEX "DealTeamMember_userId_status_idx" ON "DealTeamMember"("userId", "status");

CREATE TABLE "DealFolder" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "audienceRoles" "TeamRole"[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DealFolder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DealFolder_dealId_sortOrder_idx" ON "DealFolder"("dealId", "sortOrder");

ALTER TABLE "DealDocument" ADD COLUMN "folderId" TEXT;
ALTER TABLE "DealDocument" ADD COLUMN "storageKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "DealDocument" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DealDocument" ADD COLUMN "scanStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "DealDocument" ADD COLUMN "sponsorOnly" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "DocumentAccessLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentAccessLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DocumentAccessLog_documentId_at_idx" ON "DocumentAccessLog"("documentId", "at");

ALTER TABLE "DealTeamMember" ADD CONSTRAINT "DealTeamMember_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealTeamMember" ADD CONSTRAINT "DealTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealFolder" ADD CONSTRAINT "DealFolder_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealDocument" ADD CONSTRAINT "DealDocument_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DealFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DealDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
