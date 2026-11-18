-- Nov 5 change list. Additive only: new enum values, new columns with defaults, new tables. No data is changed or dropped.
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'SUBCONTRACTOR';
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'OTHER_PROFESSIONAL';
ALTER TABLE "Block" ADD COLUMN IF NOT EXISTS "reason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BidRequest" ADD COLUMN IF NOT EXISTS "schedule" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BidRequest" ADD COLUMN IF NOT EXISTS "scopeOfWork" TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS "BidQuestion" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "askerId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BidQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BidQuestion_requestId_idx" ON "BidQuestion"("requestId");
CREATE INDEX IF NOT EXISTS "BidQuestion_askerId_idx" ON "BidQuestion"("askerId");
DO $$ BEGIN
  ALTER TABLE "BidQuestion" ADD CONSTRAINT "BidQuestion_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BidRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "LedgerDismissal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerDismissal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerDismissal_userId_projectId_key" ON "LedgerDismissal"("userId", "projectId");
CREATE TABLE IF NOT EXISTS "CircleRemoval" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "removedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CircleRemoval_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CircleRemoval_userId_removedId_key" ON "CircleRemoval"("userId", "removedId");
