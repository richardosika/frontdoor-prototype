-- #32: fix the "Devloper" typo stored on projects
UPDATE "TrackProject" SET "role" = regexp_replace("role", '\mDevloper\M', 'Developer', 'g') WHERE "role" ~* 'devloper';
UPDATE "TrackProject" SET "role" = regexp_replace("role", '\mdevloper\M', 'developer', 'g') WHERE "role" ~ 'devloper';
UPDATE "TrackProject" SET "summary" = regexp_replace("summary", '\mDevloper\M', 'Developer', 'g') WHERE "summary" ~ 'Devloper';
UPDATE "TrackProject" SET "name" = regexp_replace("name", '\mDevloper\M', 'Developer', 'g') WHERE "name" ~ 'Devloper';
