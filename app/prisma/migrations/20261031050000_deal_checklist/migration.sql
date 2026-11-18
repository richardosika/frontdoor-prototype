CREATE TABLE "DealChecklistItem" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'NEEDED',
  "assigneeId" TEXT,
  "dueDate" TIMESTAMP(3),
  "position" INTEGER NOT NULL DEFAULT 0,
  "fileName" TEXT NOT NULL DEFAULT '',
  "contentType" TEXT NOT NULL DEFAULT '',
  "sizeBytes" INTEGER NOT NULL DEFAULT 0,
  "bytes" BYTEA,
  "fileAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealChecklistItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DealChecklistItem_dealId_position_idx" ON "DealChecklistItem"("dealId", "position");
ALTER TABLE "DealChecklistItem" ADD CONSTRAINT "DealChecklistItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealChecklistItem" ADD CONSTRAINT "DealChecklistItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DealChecklistComment" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealChecklistComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DealChecklistComment_itemId_createdAt_idx" ON "DealChecklistComment"("itemId", "createdAt");
ALTER TABLE "DealChecklistComment" ADD CONSTRAINT "DealChecklistComment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "DealChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealChecklistComment" ADD CONSTRAINT "DealChecklistComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
