-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_REQUIRED', 'DUE', 'PAID', 'WAIVED', 'FAILED', 'REFUNDED');

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_DUE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN "duesCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "paymentToken" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "renewalAt" TIMESTAMP(3),
ADD COLUMN "stripeCustomerId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "stripeSubscriptionId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "paymentMode" TEXT NOT NULL DEFAULT '',
ADD COLUMN "waiverReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN "refundNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN "lastRenewalReminderAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_paymentToken_key" ON "User"("paymentToken");

-- CreateIndex
CREATE INDEX "User_paymentStatus_idx" ON "User"("paymentStatus");

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentEvent_userId_createdAt_idx" ON "PaymentEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
