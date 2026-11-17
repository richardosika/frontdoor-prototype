-- Nov 17 (Richard's decisions 4 and 5). Additive only.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "insuranceSuspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "insuranceSuspensionLiftedAt" TIMESTAMP(3);
ALTER TABLE "InsurancePolicy" ADD COLUMN IF NOT EXISTS "limitAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InsurancePolicy" ADD COLUMN IF NOT EXISTS "aggregateAmount" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS "InsuranceExpiredReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyType" TEXT NOT NULL,
    "expiresKey" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InsuranceExpiredReminder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InsuranceExpiredReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "InsuranceExpiredReminder_userId_policyType_expiresKey_week_key" ON "InsuranceExpiredReminder"("userId", "policyType", "expiresKey", "week");
CREATE INDEX IF NOT EXISTS "InsuranceExpiredReminder_userId_idx" ON "InsuranceExpiredReminder"("userId");
