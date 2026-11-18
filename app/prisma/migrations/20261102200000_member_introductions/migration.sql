-- Member-to-member introductions. Additive only.
CREATE TABLE IF NOT EXISTS "MemberIntroduction" (
    "id" TEXT NOT NULL,
    "introducerId" TEXT NOT NULL,
    "memberAId" TEXT NOT NULL,
    "memberBId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "conversationId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberIntroduction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MemberIntroduction_introducerId_memberAId_memberBId_key" ON "MemberIntroduction"("introducerId", "memberAId", "memberBId");
CREATE INDEX IF NOT EXISTS "MemberIntroduction_memberAId_idx" ON "MemberIntroduction"("memberAId");
CREATE INDEX IF NOT EXISTS "MemberIntroduction_memberBId_idx" ON "MemberIntroduction"("memberBId");
