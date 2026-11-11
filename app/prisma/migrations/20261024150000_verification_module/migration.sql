-- CreateEnum
CREATE TYPE "VerificationSubject" AS ENUM ('MEMBER', 'PROJECT');

-- CreateEnum
CREATE TYPE "VerificationCaseStatus" AS ENUM ('NOT_STARTED', 'IN_REVIEW', 'NEEDS_INFO', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VerificationCheckResult" AS ENUM ('PENDING', 'PASS', 'FAIL', 'NEEDS_INFO');

-- CreateTable
CREATE TABLE "VerificationCase" (
    "id" TEXT NOT NULL,
    "subject" "VerificationSubject" NOT NULL,
    "status" "VerificationCaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "userId" TEXT,
    "projectId" TEXT,
    "internalNote" TEXT NOT NULL DEFAULT '',
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCheck" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "result" "VerificationCheckResult" NOT NULL DEFAULT 'PENDING',
    "note" TEXT NOT NULL DEFAULT '',
    "evidenceUrl" TEXT NOT NULL DEFAULT '',
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "VerificationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT,
    "fromStatus" "VerificationCaseStatus",
    "toStatus" "VerificationCaseStatus" NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCase_userId_key" ON "VerificationCase"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCase_projectId_key" ON "VerificationCase"("projectId");

-- CreateIndex
CREATE INDEX "VerificationCase_status_subject_idx" ON "VerificationCase"("status", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCheck_caseId_key_key" ON "VerificationCheck"("caseId", "key");

-- CreateIndex
CREATE INDEX "VerificationEvent_caseId_createdAt_idx" ON "VerificationEvent"("caseId", "createdAt");

-- AddForeignKey
ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TrackProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCheck" ADD CONSTRAINT "VerificationCheck_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "VerificationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCheck" ADD CONSTRAINT "VerificationCheck_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationEvent" ADD CONSTRAINT "VerificationEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "VerificationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationEvent" ADD CONSTRAINT "VerificationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
