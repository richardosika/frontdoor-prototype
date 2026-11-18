-- AlterEnum
ALTER TYPE "VerificationCheckResult" ADD VALUE 'NOT_PROVIDED';

-- CreateEnum
CREATE TYPE "InviteRequestStatus" AS ENUM ('PENDING', 'ISSUED', 'DECLINED');

-- CreateTable
CREATE TABLE "InviteRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "org" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "status" "InviteRequestStatus" NOT NULL DEFAULT 'PENDING',
    "inviteCodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InviteRequest_status_createdAt_idx" ON "InviteRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "InviteRequest_email_idx" ON "InviteRequest"("email");

-- AddForeignKey
ALTER TABLE "InviteRequest" ADD CONSTRAINT "InviteRequest_inviteCodeId_fkey" FOREIGN KEY ("inviteCodeId") REFERENCES "InviteCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
