-- Nov 10 (Julia): Deal Rooms in each project. Additive only: new nullable/defaulted columns. No data is changed or dropped.
ALTER TABLE "DealDocument" ADD COLUMN IF NOT EXISTS "bytes" BYTEA;
ALTER TABLE "DealDocument" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "projectAccessMode" TEXT NOT NULL DEFAULT 'APPROVAL';
