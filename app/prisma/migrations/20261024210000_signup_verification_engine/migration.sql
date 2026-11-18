ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'NEEDS_INFO';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'DECLINED';

CREATE TYPE "Verdict" AS ENUM ('LEGIT', 'NOT_LEGIT', 'NEEDS_OWNER_DECISION');
CREATE TYPE "EvidenceStatus" AS ENUM ('PASS', 'FAIL', 'INCONCLUSIVE', 'NOT_RUN');
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');
CREATE TYPE "RunSubject" AS ENUM ('APPLICATION', 'COMPANY', 'PROJECT');

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "website" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "socialLinks" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "internalNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "duesCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "duesWaived" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "testProfile" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "Application_status_createdAt_idx" ON "Application"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Application_isTest_idx" ON "Application"("isTest");

CREATE TABLE IF NOT EXISTS "EmailChallenge" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EmailChallenge_email_createdAt_idx" ON "EmailChallenge"("email", "createdAt");

CREATE TABLE IF NOT EXISTS "LegalAcceptance" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "document" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LegalAcceptance_applicationId_idx" ON "LegalAcceptance"("applicationId");
CREATE INDEX IF NOT EXISTS "LegalAcceptance_userId_idx" ON "LegalAcceptance"("userId");

CREATE TABLE IF NOT EXISTS "OutboxNotice" (
  "id" TEXT NOT NULL,
  "intendedTo" TEXT NOT NULL,
  "deliveredTo" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "applicationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboxNotice_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OutboxNotice_createdAt_idx" ON "OutboxNotice"("createdAt");

CREATE TABLE IF NOT EXISTS "ApplicationDecision" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "actorId" TEXT,
  "decision" TEXT NOT NULL,
  "reason" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationDecision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ApplicationDecision_applicationId_createdAt_idx" ON "ApplicationDecision"("applicationId", "createdAt");

CREATE TABLE IF NOT EXISTS "VerificationRun" (
  "id" TEXT NOT NULL,
  "subject" "RunSubject" NOT NULL,
  "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
  "applicationId" TEXT,
  "projectId" TEXT,
  "companyName" TEXT NOT NULL DEFAULT '',
  "score" INTEGER,
  "verdict" "Verdict",
  "summary" TEXT NOT NULL DEFAULT '',
  "error" TEXT NOT NULL DEFAULT '',
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VerificationRun_applicationId_createdAt_idx" ON "VerificationRun"("applicationId", "createdAt");
CREATE INDEX IF NOT EXISTS "VerificationRun_status_idx" ON "VerificationRun"("status");

CREATE TABLE IF NOT EXISTS "VerificationEvidence" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "checkKey" TEXT NOT NULL,
  "status" "EvidenceStatus" NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 0,
  "finding" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "url" TEXT NOT NULL DEFAULT '',
  "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationEvidence_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VerificationEvidence_runId_idx" ON "VerificationEvidence"("runId");

CREATE TABLE IF NOT EXISTS "SourceCache" (
  "key" TEXT NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "body" TEXT NOT NULL,
  CONSTRAINT "SourceCache_pkey" PRIMARY KEY ("key")
);

DO $$ BEGIN
  ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OutboxNotice" ADD CONSTRAINT "OutboxNotice_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ApplicationDecision" ADD CONSTRAINT "ApplicationDecision_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ApplicationDecision" ADD CONSTRAINT "ApplicationDecision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "VerificationRun" ADD CONSTRAINT "VerificationRun_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "VerificationEvidence" ADD CONSTRAINT "VerificationEvidence_runId_fkey" FOREIGN KEY ("runId") REFERENCES "VerificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
