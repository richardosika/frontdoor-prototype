-- Nov 10 (Julia): the X on an Opportunities card. Additive only: one new table. No data is changed or dropped.
CREATE TABLE IF NOT EXISTS "OpportunityDismissal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpportunityDismissal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OpportunityDismissal_userId_projectId_key" ON "OpportunityDismissal"("userId", "projectId");
CREATE INDEX IF NOT EXISTS "OpportunityDismissal_userId_idx" ON "OpportunityDismissal"("userId");
