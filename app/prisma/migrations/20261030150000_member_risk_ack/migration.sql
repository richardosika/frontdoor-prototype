-- Member-risk acknowledgement on the two-page application.
ALTER TABLE "Application" ADD COLUMN "memberRiskAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN "memberRiskTermsVersion" TEXT NOT NULL DEFAULT '';
