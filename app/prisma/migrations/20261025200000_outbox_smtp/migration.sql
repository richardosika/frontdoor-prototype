-- AlterTable
ALTER TABLE "OutboxNotice" ADD COLUMN "smtpStatus" TEXT NOT NULL DEFAULT '',
ADD COLUMN "smtpError" TEXT NOT NULL DEFAULT '';
