-- Nov 10 (Julia): bid versions (original + up to 5 updates). Additive only: one new table. No data is changed or dropped.
CREATE TABLE IF NOT EXISTS "BidRevision" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "values" TEXT NOT NULL DEFAULT '{}',
    "answers" TEXT NOT NULL DEFAULT '[]',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BidRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BidRevision_bidId_version_key" ON "BidRevision"("bidId", "version");
CREATE INDEX IF NOT EXISTS "BidRevision_bidId_idx" ON "BidRevision"("bidId");
DO $$ BEGIN
  ALTER TABLE "BidRevision" ADD CONSTRAINT "BidRevision_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
