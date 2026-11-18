-- The greeting uses the first-name field as entered, including spaces.
ALTER TABLE "InviteRequest" ADD COLUMN "givenName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Application" ADD COLUMN "givenName" TEXT NOT NULL DEFAULT '';
