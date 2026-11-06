-- Nov 6 Subcontractors. Additive only: new columns with defaults and new tables. No data is changed or dropped.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trades" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "metros" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "unionShop" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "prevailingWage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "licenseNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "licenseState" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bondingCapacity" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BidRequest" ADD COLUMN IF NOT EXISTS "trade" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BidRequest" ADD COLUMN IF NOT EXISTS "serviceStates" TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS "InsuranceCertificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InsuranceCertificate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "InsuranceCertificate_userId_key" ON "InsuranceCertificate"("userId");
DO $$ BEGIN
  ALTER TABLE "InsuranceCertificate" ADD CONSTRAINT "InsuranceCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "BidRequest_trade_idx" ON "BidRequest"("trade");
