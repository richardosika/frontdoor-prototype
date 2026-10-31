CREATE TABLE "ProfileView" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProfileView_memberId_viewerId_day_key" ON "ProfileView"("memberId", "viewerId", "day");
CREATE INDEX "ProfileView_memberId_createdAt_idx" ON "ProfileView"("memberId", "createdAt");
