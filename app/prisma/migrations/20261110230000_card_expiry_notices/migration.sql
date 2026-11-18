-- Nov 10 (Julia): card-expiry emails sent. Additive only: one new table. No data is changed or dropped.
CREATE TABLE IF NOT EXISTS "CardExpiryNotice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "expKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardExpiryNotice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CardExpiryNotice_userId_kind_expKey_key" ON "CardExpiryNotice"("userId", "kind", "expKey");
CREATE INDEX IF NOT EXISTS "CardExpiryNotice_userId_idx" ON "CardExpiryNotice"("userId");
