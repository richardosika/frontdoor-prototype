-- Construction plans on bid requests. Additive only.
CREATE TABLE IF NOT EXISTS "BidPlan" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BidPlan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BidPlan_requestId_idx" ON "BidPlan"("requestId");
ALTER TABLE "BidPlan" ADD CONSTRAINT "BidPlan_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BidRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
