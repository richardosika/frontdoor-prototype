-- Guided review can be tied to an application or a request-to-join before a member account exists.
ALTER TABLE "VerificationCase" ADD COLUMN "applicationId" TEXT;
ALTER TABLE "VerificationCase" ADD COLUMN "inviteRequestId" TEXT;
ALTER TABLE "VerificationCase" ADD COLUMN "gradeSnapshot" JSONB;

CREATE UNIQUE INDEX "VerificationCase_applicationId_key" ON "VerificationCase"("applicationId");
CREATE UNIQUE INDEX "VerificationCase_inviteRequestId_key" ON "VerificationCase"("inviteRequestId");

ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_inviteRequestId_fkey" FOREIGN KEY ("inviteRequestId") REFERENCES "InviteRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A prefilled mark stays Auto-suggested until an administrator confirms it.
ALTER TABLE "VerificationCheck" ADD COLUMN "autoSuggested" BOOLEAN NOT NULL DEFAULT false;
