-- Nov 17: member insurance contacts, policies, reminder claims, and application uploads.
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "insuranceAgentName" TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "insuranceAgentEmail" TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "insuranceAgentPhone" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "otherName" TEXT NOT NULL DEFAULT '',
    "expiresOn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InsurancePolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "InsurancePolicy_userId_idx" ON "InsurancePolicy"("userId");

CREATE TABLE IF NOT EXISTS "InsuranceReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyType" TEXT NOT NULL,
    "expiresKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InsuranceReminder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InsuranceReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "InsuranceReminder_userId_policyType_expiresKey_key" ON "InsuranceReminder"("userId", "policyType", "expiresKey");

CREATE TABLE IF NOT EXISTS "ApplicationInsuranceFile" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationInsuranceFile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ApplicationInsuranceFile_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ApplicationInsuranceFile_applicationId_key" ON "ApplicationInsuranceFile"("applicationId");
