-- Grade snapshot stored with each verification run. Old rows stay blank until a re-run.
ALTER TABLE "VerificationRun" ADD COLUMN "gradeLetter" TEXT NOT NULL DEFAULT '';
ALTER TABLE "VerificationRun" ADD COLUMN "gradeScore" INTEGER;
ALTER TABLE "VerificationRun" ADD COLUMN "gradeConfidence" TEXT NOT NULL DEFAULT '';
ALTER TABLE "VerificationRun" ADD COLUMN "recommendation" TEXT NOT NULL DEFAULT '';
ALTER TABLE "VerificationRun" ADD COLUMN "gradeSnapshot" JSONB;

ALTER TABLE "VerificationEvidence" ADD COLUMN "hardFlag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VerificationEvidence" ADD COLUMN "reviewFlag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VerificationEvidence" ADD COLUMN "corroborates" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ApplicationDecision" ADD COLUMN "gradeLetter" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ApplicationDecision" ADD COLUMN "gradeScore" INTEGER;
ALTER TABLE "ApplicationDecision" ADD COLUMN "recommendation" TEXT NOT NULL DEFAULT '';
