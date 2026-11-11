-- AlterTable
ALTER TABLE "Deal" ADD COLUMN "stage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Deal" ADD COLUMN "need" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "stage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Post" ADD COLUMN "need" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedFilter_userId_surface_idx" ON "SavedFilter"("userId", "surface");

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Fill the seeded demo projects so filters have something to match. Blank member posts stay blank.
UPDATE "Deal" SET "stage" = 'stabilized', "need" = 'equity' WHERE "id" = 'deal_newark' AND "stage" = '';
UPDATE "Deal" SET "stage" = 'stabilized', "need" = 'equity' WHERE "id" = 'deal_edison' AND "stage" = '';
UPDATE "Deal" SET "stage" = 'pre-construction', "need" = 'gc' WHERE "id" = 'deal_hoboken' AND "stage" = '';
UPDATE "Deal" SET "stage" = 'construction', "need" = 'equity' WHERE "id" = 'deal_brooklyn' AND "stage" = '';
UPDATE "Deal" SET "stage" = 'stabilized', "need" = 'equity' WHERE "id" = 'deal_jc' AND "stage" = '';
UPDATE "Deal" SET "stage" = 'construction', "need" = 'advisory' WHERE "id" = 'deal_brarch' AND "stage" = '';
UPDATE "Deal" SET "stage" = 'land', "need" = 'advisory' WHERE "id" = 'deal_nzone' AND "stage" = '';
UPDATE "Deal" SET "stage" = 'pre-construction', "need" = 'debt' WHERE "id" = 'deal_edlend' AND "stage" = '';

UPDATE "Post" AS p
SET
  "stage" = CASE WHEN p."stage" = '' THEN d."stage" ELSE p."stage" END,
  "need" = CASE WHEN p."need" = '' THEN d."need" ELSE p."need" END,
  "market" = CASE WHEN p."market" = '' THEN d."market" ELSE p."market" END,
  "assetClass" = CASE WHEN p."assetClass" = '' THEN d."assetClass" ELSE p."assetClass" END,
  "title" = CASE WHEN p."title" = '' THEN d."title" ELSE p."title" END
FROM "Deal" AS d
WHERE p."dealId" = d."id"
  AND d."id" IN ('deal_newark', 'deal_edison', 'deal_hoboken', 'deal_brooklyn', 'deal_jc', 'deal_brarch', 'deal_nzone', 'deal_edlend');
