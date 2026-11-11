-- CreateEnum
CREATE TYPE "CrmStage" AS ENUM ('INVITED', 'APPLIED', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'DECLINED');

-- AlterTable
ALTER TABLE "OutboxNotice" ADD COLUMN "templateKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN "suppressed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "suppressedReason" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "MailSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "delivery" TEXT NOT NULL DEFAULT 'outbox',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "savedById" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmPerson" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "org" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "stage" "CrmStage" NOT NULL DEFAULT 'INVITED',
    "manualStage" "CrmStage",
    "tags" TEXT NOT NULL DEFAULT '',
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "doNotContactReason" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT,
    "followUpAt" TIMESTAMP(3),
    "followUpNote" TEXT NOT NULL DEFAULT '',
    "inviteCode" TEXT NOT NULL DEFAULT '',
    "inviteRequestId" TEXT,
    "applicationId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmNote" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmEvent" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_key_key" ON "EmailTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplateVersion_templateId_version_key" ON "EmailTemplateVersion"("templateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CrmPerson_email_key" ON "CrmPerson"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CrmPerson_inviteRequestId_key" ON "CrmPerson"("inviteRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmPerson_applicationId_key" ON "CrmPerson"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmPerson_userId_key" ON "CrmPerson"("userId");

-- CreateIndex
CREATE INDEX "CrmPerson_stage_idx" ON "CrmPerson"("stage");

-- CreateIndex
CREATE INDEX "CrmPerson_followUpAt_idx" ON "CrmPerson"("followUpAt");

-- CreateIndex
CREATE INDEX "CrmNote_personId_createdAt_idx" ON "CrmNote"("personId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrmEvent_sourceKey_key" ON "CrmEvent"("sourceKey");

-- CreateIndex
CREATE INDEX "CrmEvent_personId_createdAt_idx" ON "CrmEvent"("personId", "createdAt");

-- AddForeignKey
ALTER TABLE "EmailTemplateVersion" ADD CONSTRAINT "EmailTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPerson" ADD CONSTRAINT "CrmPerson_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPerson" ADD CONSTRAINT "CrmPerson_inviteRequestId_fkey" FOREIGN KEY ("inviteRequestId") REFERENCES "InviteRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPerson" ADD CONSTRAINT "CrmPerson_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPerson" ADD CONSTRAINT "CrmPerson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_personId_fkey" FOREIGN KEY ("personId") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmEvent" ADD CONSTRAINT "CrmEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "CrmPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
