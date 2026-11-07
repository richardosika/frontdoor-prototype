-- CreateEnum
CREATE TYPE "MemberImageKind" AS ENUM ('AVATAR', 'COVER', 'GALLERY');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "audience" TEXT NOT NULL DEFAULT 'member';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "coverId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "photoId" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "MemberImage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "MemberImageKind" NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "contentType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberImage_userId_kind_position_idx" ON "MemberImage"("userId", "kind", "position");

-- AddForeignKey
ALTER TABLE "MemberImage" ADD CONSTRAINT "MemberImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Older admin notices (applicant grades, review queues) link into Admin. Keep them off member Alerts.
UPDATE "Notification" SET "audience" = 'admin' WHERE "href" LIKE '/admin%';
