-- Vendor showcase and licences (P3). Additive.
-- Apply with: cd app && npx prisma migrate deploy
-- Do not point DATABASE_URL at the live test site. This does not change the verification engine, applications, or payments.

CREATE TYPE "Availability" AS ENUM ('OPEN', 'SELECTIVE', 'BOOKED');
CREATE TYPE "LicenseKind" AS ENUM ('CONTRACTOR', 'BAR_ADMISSION', 'BROKER', 'MORTGAGE_ORIGINATOR', 'DESIGN_PROFESSIONAL', 'APPRAISER', 'INSURANCE_PRODUCER', 'CPA', 'FACILITY_OPERATOR', 'OTHER');
CREATE TYPE "LicenseStatus" AS ENUM ('SELF_REPORTED', 'UNDER_REVIEW', 'VERIFIED', 'NOT_FOUND', 'EXPIRED', 'REJECTED');

ALTER TABLE "TrackProject" ADD COLUMN "inShowcase" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TrackProject" ADD COLUMN "showcaseRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Confirmation" ADD COLUMN "showName" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "VendorProfile" (
    "userId" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT '',
    "services" TEXT NOT NULL DEFAULT '',
    "projectSizeBand" TEXT NOT NULL DEFAULT '',
    "yearsInBusiness" INTEGER,
    "availability" "Availability" NOT NULL DEFAULT 'OPEN',
    "availableFrom" TIMESTAMP(3),
    "availabilityNote" TEXT NOT NULL DEFAULT '',
    "acceptingRequests" BOOLEAN NOT NULL DEFAULT true,
    "showcaseStatus" TEXT NOT NULL DEFAULT 'HIDDEN',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    CONSTRAINT "VendorProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "LicenseKind" NOT NULL,
    "stateCode" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT '',
    "number" TEXT NOT NULL DEFAULT '',
    "status" "LicenseStatus" NOT NULL DEFAULT 'SELF_REPORTED',
    "expiresOn" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "recheckOn" TIMESTAMP(3),
    "verifiedById" TEXT,
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "showOnProfile" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "License_stateCode_kind_status_idx" ON "License"("stateCode", "kind", "status");
CREATE INDEX "License_userId_status_idx" ON "License"("userId", "status");

CREATE TABLE "LicenseSource" (
    "id" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "kind" "LicenseKind" NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'MANUAL',
    CONSTRAINT "LicenseSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LicenseSource_stateCode_kind_key" ON "LicenseSource"("stateCode", "kind");

CREATE TABLE "VendorCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "issuer" TEXT NOT NULL DEFAULT '',
    "expiresOn" TIMESTAMP(3),
    "evidenceUrl" TEXT NOT NULL DEFAULT '',
    "verifiedAt" TIMESTAMP(3),
    "visible" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "VendorCredential_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VendorCredential_userId_idx" ON "VendorCredential"("userId");

ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "License" ADD CONSTRAINT "License_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorCredential" ADD CONSTRAINT "VendorCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
