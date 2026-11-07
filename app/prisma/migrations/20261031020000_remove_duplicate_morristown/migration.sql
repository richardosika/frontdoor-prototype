-- #32 follow-up (approved by Richard, test site): remove the duplicate Morristown project on Richard's account.
-- Keep the one with more data; if equal, keep the older. Related documents, contacts, confirmations and the
-- project verification cascade; linked deals are unlinked. The removal is written to the moderation log.
WITH owner AS (
  SELECT id FROM "User" WHERE lower(email) = 'rich@privatefloorclub.com'
), candidates AS (
  SELECT p.id, p.name, p."createdAt",
    (SELECT count(*) FROM "ProjectDocument" d WHERE d."projectId" = p.id) * 10
    + (SELECT count(*) FROM "ProjectContact" c WHERE c."projectId" = p.id) * 5
    + (SELECT count(*) FROM "Confirmation" c WHERE c."projectId" = p.id) * 5
    + (SELECT count(*) FROM "Deal" d WHERE d."projectId" = p.id) * 5
    + CASE WHEN p.summary <> '' THEN 2 ELSE 0 END
    + CASE WHEN p.street <> '' THEN 1 ELSE 0 END
    + CASE WHEN p.seeking <> '' THEN 1 ELSE 0 END
    + CASE WHEN p."valueLabel" <> '' THEN 1 ELSE 0 END
    + CASE WHEN p.role <> '' THEN 1 ELSE 0 END AS score
  FROM "TrackProject" p
  WHERE p."userId" IN (SELECT id FROM owner) AND (p.name ILIKE '%morristown%' OR p.location ILIKE '%morristown%' OR p.city ILIKE '%morristown%')
), ranked AS (
  SELECT *, row_number() OVER (ORDER BY score DESC, "createdAt" ASC) AS rn, count(*) OVER () AS total FROM candidates
), victim AS (
  SELECT * FROM ranked WHERE total = 2 AND rn = 2
), logged AS (
  INSERT INTO "ModerationEvent" (id, "actorId", action, summary)
  SELECT 'mig_morristown_' || v.id, (SELECT id FROM owner), 'DELETE_DUPLICATE_PROJECT',
         'Removed duplicate project "' || v.name || '" (' || v.id || ', created ' || to_char(v."createdAt", 'YYYY-MM-DD HH24:MI') || ' UTC, data score ' || v.score || '). Kept "' || k.name || '" (' || k.id || ', score ' || k.score || ').'
  FROM victim v, ranked k WHERE k.rn = 1
  RETURNING id
)
DELETE FROM "TrackProject" WHERE id IN (SELECT id FROM victim);
