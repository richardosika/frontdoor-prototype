-- Messaging hardening (P2). Additive.
-- Apply with: cd app && npx prisma migrate deploy
-- Do not point DATABASE_URL at the live test site. This does not change verification, applications, or payments.

CREATE TYPE "ConversationState" AS ENUM ('REQUESTED', 'ACTIVE', 'CLOSED');
CREATE TYPE "ReportCategory" AS ENUM ('SPAM', 'SOLICITATION', 'HARASSMENT', 'IMPERSONATION', 'OTHER');
CREATE TYPE "EmailMode" AS ENUM ('INSTANT', 'THROTTLED', 'DIGEST', 'OFF');
CREATE TYPE "RestrictionKind" AS ENUM ('MESSAGING_PAUSED', 'MESSAGING_SUSPENDED');

ALTER TABLE "Conversation" ADD COLUMN "state" "ConversationState" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Conversation" ADD COLUMN "initiatedById" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Conversation" ADD COLUMN "requestNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Conversation" ADD COLUMN "acceptedAt" TIMESTAMP(3);
ALTER TABLE "Conversation" ADD COLUMN "mutedByA" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Conversation" ADD COLUMN "mutedByB" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Report" ADD COLUMN "messageId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Report" ADD COLUMN "category" "ReportCategory" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "Report" ADD COLUMN "resolvedById" TEXT;
ALTER TABLE "Report" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "Report" ADD COLUMN "resolutionNote" TEXT NOT NULL DEFAULT '';
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

ALTER TABLE "ModerationEvent" ADD COLUMN "targetUserId" TEXT;
ALTER TABLE "ModerationEvent" ADD COLUMN "targetType" TEXT NOT NULL DEFAULT '';
CREATE INDEX "ModerationEvent_targetUserId_createdAt_idx" ON "ModerationEvent"("targetUserId", "createdAt");

CREATE TABLE "NotificationPref" (
    "userId" TEXT NOT NULL,
    "messages" "EmailMode" NOT NULL DEFAULT 'THROTTLED',
    "requests" "EmailMode" NOT NULL DEFAULT 'INSTANT',
    "dealUpdates" "EmailMode" NOT NULL DEFAULT 'DIGEST',
    "quietStartHr" INTEGER,
    "quietEndHr" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    CONSTRAINT "NotificationPref_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "EmailThrottle" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "suppressedCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EmailThrottle_pkey" PRIMARY KEY ("userId","key")
);

CREATE TABLE "UserRestriction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "RestrictionKind" NOT NULL,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRestriction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserRestriction_userId_endsAt_idx" ON "UserRestriction"("userId", "endsAt");

CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "NotificationPref" ADD CONSTRAINT "NotificationPref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailThrottle" ADD CONSTRAINT "EmailThrottle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRestriction" ADD CONSTRAINT "UserRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
