-- #46 structured insurance. Existing free text stays in insuranceInfo and shows as notes.
ALTER TABLE "User" ADD COLUMN "insuranceCoverage" JSONB NOT NULL DEFAULT '[]';
