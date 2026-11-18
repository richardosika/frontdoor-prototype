-- CreateTable
CREATE TABLE "HelpArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpTurn" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "unanswered" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL,
    "feedback" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpTurn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HelpArticle_slug_key" ON "HelpArticle"("slug");

-- CreateIndex
CREATE INDEX "HelpTurn_sessionKey_createdAt_idx" ON "HelpTurn"("sessionKey", "createdAt");

-- CreateIndex
CREATE INDEX "HelpTurn_unanswered_createdAt_idx" ON "HelpTurn"("unanswered", "createdAt");

-- CreateIndex
CREATE INDEX "HelpTurn_createdAt_idx" ON "HelpTurn"("createdAt");
