-- AlterTable
ALTER TABLE "OutboxNotice" RENAME COLUMN "smtpStatus" TO "sendStatus";
ALTER TABLE "OutboxNotice" RENAME COLUMN "smtpError" TO "sendError";
