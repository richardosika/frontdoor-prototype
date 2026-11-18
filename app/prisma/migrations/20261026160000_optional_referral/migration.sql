-- Applications can be submitted with no referral code.
ALTER TABLE "Application" ALTER COLUMN "inviteCodeId" DROP NOT NULL;
