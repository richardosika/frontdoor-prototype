-- #38 optional vendor profile fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "yearsInBusiness" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "typicalJobSize" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "licenses" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "insuranceInfo" TEXT NOT NULL DEFAULT '';

-- Elena Voss demo profile, filled in so the vendor profile looks complete.
UPDATE "User" SET
  "org" = CASE WHEN "org" = '' THEN 'Voss & Reed Builders' ELSE "org" END,
  "location" = CASE WHEN "location" = '' THEN 'Hoboken, NJ' ELSE "location" END,
  "offering" = CASE WHEN "offering" = '' THEN 'Ground-up and gut-renovation general contracting for mid-rise residential and mixed-use projects in North Jersey. Preconstruction budgeting, value engineering, and open-book GMP contracts.' ELSE "offering" END,
  "bio" = CASE WHEN "bio" = '' THEN 'Elena leads Voss & Reed, a Hoboken general contractor focused on 4 to 8 story residential and mixed-use buildings.' ELSE "bio" END,
  "markets" = CASE WHEN "markets" = '' THEN 'Hudson County, Essex County, Bergen County, Jersey City' ELSE "markets" END,
  "assetClasses" = CASE WHEN "assetClasses" = '' THEN 'Multifamily, Mixed-use, Single family / townhome' ELSE "assetClasses" END,
  "yearsInBusiness" = '18',
  "typicalJobSize" = '$5M to $40M',
  "licenses" = 'NJ Home Improvement Contractor 13VH09876500; NJ DPMC classified (C008 General Construction)',
  "insuranceInfo" = 'General liability $2M per occurrence / $4M aggregate; umbrella $10M; builder''s risk available; workers'' comp',
  "website" = CASE WHEN "website" = '' THEN 'https://vossreed.example' ELSE "website" END
WHERE "email" = 'elena.voss@vossreed.example';

-- Morristown: "40M" becomes a plain number; notes that only repeat the owner's role are cleared.
UPDATE "TrackProject" SET "valueLabel" = '40000000' WHERE "name" ILIKE 'Morristown%' AND "valueLabel" ~* '^\$?\s*40\s*m{1,2}$';
UPDATE "TrackProject" SET "summary" = '' WHERE lower(trim("summary")) IN ('developer', 'devloper', 'owner', 'sponsor');
