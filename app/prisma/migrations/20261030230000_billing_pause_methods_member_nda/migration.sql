-- CreateEnum
CREATE TYPE "PaymentMethodRole" AS ENUM ('PRIMARY', 'BACKUP');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ndaAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "ndaVersion" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "pauseReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "pausedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PaymentMethodRole" NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL DEFAULT '',
    "brand" TEXT NOT NULL DEFAULT '',
    "last4" TEXT NOT NULL DEFAULT '',
    "expMonth" INTEGER NOT NULL DEFAULT 0,
    "expYear" INTEGER NOT NULL DEFAULT 0,
    "wallet" TEXT NOT NULL DEFAULT '',
    "mode" TEXT NOT NULL DEFAULT 'stripe',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_userId_role_key" ON "PaymentMethod"("userId", "role");

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

