-- One guided review per applicant, including a request to join that has no application yet.
ALTER TABLE "VerificationCase" ADD COLUMN "sourceSnapshot" JSONB;
ALTER TABLE "VerificationCase" ADD COLUMN "reviewProgress" JSONB;
