-- Reword the stored info-template history subjects. The rows stay.
-- Safe to run again: a subject that is already current no longer matches.
UPDATE "EmailTemplateVersion" AS version
SET subject = 'About Private Floor'
FROM "EmailTemplate" AS template
WHERE version."templateId" = template.id
  AND template.key = 'info'
  AND version.version IN (1, 2)
  AND version.subject = 'You''re invited to Private Floor';
