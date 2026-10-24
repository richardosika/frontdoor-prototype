-- Business cards are stored as bytea. Render free-tier disk is ephemeral, so the file is not written to the filesystem.
-- Existing rows are updated in place. This migration does not delete members, applications, or invite codes.

CREATE TABLE "BusinessCard" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "BusinessCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessCard_applicationId_key" ON "BusinessCard"("applicationId");
CREATE UNIQUE INDEX "BusinessCard_userId_key" ON "BusinessCard"("userId");

ALTER TABLE "BusinessCard" ADD CONSTRAINT "BusinessCard_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessCard" ADD CONSTRAINT "BusinessCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InviteRequest" ADD COLUMN "statusToken" TEXT;

UPDATE "InviteRequest"
SET "statusToken" = md5(random()::text || "id" || clock_timestamp()::text)
WHERE "statusToken" IS NULL;

ALTER TABLE "InviteRequest" ALTER COLUMN "statusToken" SET NOT NULL;

CREATE UNIQUE INDEX "InviteRequest_statusToken_key" ON "InviteRequest"("statusToken");

-- Membership tier is Invited or Confirmed. The old Verified tier value is retired in data, not dropped from the enum.
UPDATE "User" AS u
SET "tier" = 'CONFIRMED'
WHERE u."tier" = 'VERIFIED'
  AND EXISTS (
    SELECT 1
    FROM "TrackProject" AS p
    JOIN "Confirmation" AS c ON c."projectId" = p."id"
    WHERE p."userId" = u."id"
      AND c."reviewStatus" = 'APPROVED'
  );

UPDATE "User" SET "tier" = 'INVITED' WHERE "tier" = 'VERIFIED';

UPDATE "VerificationCheck"
SET "label" = 'Match business card to public records'
WHERE "key" = 'license';

UPDATE "User"
SET "credentialNote" = 'Business card matched to public records'
WHERE "credentialNote" ~* '(licen[cs]e|nmls)';

UPDATE "Application"
SET "credentialValue" = 'No business card uploaded'
WHERE "credentialValue" NOT IN ('Business card uploaded', 'No business card uploaded');
