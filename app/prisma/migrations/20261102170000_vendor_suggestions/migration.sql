-- Suggest a vendor + dues credits. Additive only.
CREATE TABLE IF NOT EXISTS "VendorSuggestion" (
    "id" TEXT NOT NULL,
    "suggestedById" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "contact" TEXT NOT NULL DEFAULT '',
    "relation" TEXT NOT NULL DEFAULT 'WORKED',
    "note" TEXT NOT NULL DEFAULT '',
    "nameOk" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'IN_REVIEW',
    "inviteCodeId" TEXT,
    "applicationId" TEXT,
    "vendorUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VendorSuggestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "VendorSuggestion_inviteCodeId_key" ON "VendorSuggestion"("inviteCodeId");
CREATE UNIQUE INDEX IF NOT EXISTS "VendorSuggestion_applicationId_key" ON "VendorSuggestion"("applicationId");
CREATE INDEX IF NOT EXISTS "VendorSuggestion_suggestedById_createdAt_idx" ON "VendorSuggestion"("suggestedById", "createdAt");
CREATE INDEX IF NOT EXISTS "VendorSuggestion_status_idx" ON "VendorSuggestion"("status");
ALTER TABLE "VendorSuggestion" ADD CONSTRAINT "VendorSuggestion_suggestedById_fkey" FOREIGN KEY ("suggestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "DuesCredit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "cents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "reason" TEXT NOT NULL DEFAULT '',
    "stripeBalanceTxnId" TEXT NOT NULL DEFAULT '',
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DuesCredit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DuesCredit_suggestionId_key" ON "DuesCredit"("suggestionId");
CREATE INDEX IF NOT EXISTS "DuesCredit_userId_createdAt_idx" ON "DuesCredit"("userId", "createdAt");
ALTER TABLE "DuesCredit" ADD CONSTRAINT "DuesCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
