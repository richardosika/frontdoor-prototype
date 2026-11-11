-- #51 Bids / proposals
CREATE TABLE "BidTemplate" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "fields" TEXT NOT NULL DEFAULT '[]',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BidRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "questions" TEXT NOT NULL DEFAULT '[]',
    "units" INTEGER,
    "squareFeet" INTEGER,
    "basisNote" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BidRecipient" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidRecipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "values" TEXT NOT NULL DEFAULT '{}',
    "answers" TEXT NOT NULL DEFAULT '[]',
    "pdfName" TEXT NOT NULL DEFAULT '',
    "pdfSize" INTEGER NOT NULL DEFAULT 0,
    "pdfBytes" BYTEA,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BidTemplate_status_idx" ON "BidTemplate"("status");

CREATE UNIQUE INDEX "BidTemplate_category_version_key" ON "BidTemplate"("category", "version");

CREATE INDEX "BidRequest_projectId_idx" ON "BidRequest"("projectId");

CREATE INDEX "BidRequest_requesterId_idx" ON "BidRequest"("requesterId");

CREATE INDEX "BidRecipient_memberId_idx" ON "BidRecipient"("memberId");

CREATE UNIQUE INDEX "BidRecipient_requestId_memberId_key" ON "BidRecipient"("requestId", "memberId");

CREATE INDEX "Bid_bidderId_idx" ON "Bid"("bidderId");

CREATE UNIQUE INDEX "Bid_requestId_bidderId_key" ON "Bid"("requestId", "bidderId");

ALTER TABLE "BidRequest" ADD CONSTRAINT "BidRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TrackProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BidRequest" ADD CONSTRAINT "BidRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BidRequest" ADD CONSTRAINT "BidRequest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BidTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BidRecipient" ADD CONSTRAINT "BidRecipient_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BidRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BidRecipient" ADD CONSTRAINT "BidRecipient_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Bid" ADD CONSTRAINT "Bid_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BidRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Bid" ADD CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
