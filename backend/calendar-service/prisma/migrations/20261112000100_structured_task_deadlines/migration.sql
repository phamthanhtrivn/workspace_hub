-- Deadlines are local calendar dates and optional wall-clock times, not UTC instants.
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "deadline_date" VARCHAR(10), ADD COLUMN IF NOT EXISTS "deadline_time" VARCHAR(5);
ALTER TABLE "recurrence_series" ADD COLUMN IF NOT EXISTS "deadline_date" VARCHAR(10), ADD COLUMN IF NOT EXISTS "deadline_time" VARCHAR(5);

-- Keep legacy recurring templates and their materialized occurrences consistent.
UPDATE "recurrence_series"
SET "source_type" = 'TASK'
WHERE "source_type" = 'USER' AND "description" ~ '^\s*\[TASK\]';
UPDATE "calendar_events"
SET "source_type" = 'TASK'
WHERE "source_type" = 'USER' AND "source_id" IS NULL AND "description" ~ '^\s*\[TASK\]';

WITH legacy AS (
  SELECT "id", regexp_match("description", '\[(?:Deadline|Hạn chót):\s*(\d{4}-\d{2}-\d{2})(?:\s+([0-2][0-9]:[0-5][0-9]))?\]', 'i') AS deadline
  FROM "calendar_events" WHERE "source_type" = 'TASK'
)
UPDATE "calendar_events" AS event
SET "deadline_date" = COALESCE(event."deadline_date", legacy.deadline[1]), "deadline_time" = COALESCE(event."deadline_time", legacy.deadline[2])
FROM legacy WHERE event."id" = legacy."id" AND legacy.deadline IS NOT NULL;
WITH legacy AS (
  SELECT "id", regexp_match("description", '\[(?:Deadline|Hạn chót):\s*(\d{4}-\d{2}-\d{2})(?:\s+([0-2][0-9]:[0-5][0-9]))?\]', 'i') AS deadline
  FROM "recurrence_series" WHERE "source_type" = 'TASK'
)
UPDATE "recurrence_series" AS series
SET "deadline_date" = COALESCE(series."deadline_date", legacy.deadline[1]), "deadline_time" = COALESCE(series."deadline_time", legacy.deadline[2])
FROM legacy WHERE series."id" = legacy."id" AND legacy.deadline IS NOT NULL;

UPDATE "calendar_events"
SET "description" = NULLIF(btrim(regexp_replace(regexp_replace("description", '^\s*\[TASK\]\s*', ''), '\s*\[(?:Deadline|Hạn chót):\s*\d{4}-\d{2}-\d{2}(?:\s+[0-2][0-9]:[0-5][0-9])?\]', '', 'gi')), '')
WHERE "source_type" = 'TASK';
UPDATE "recurrence_series"
SET "description" = NULLIF(btrim(regexp_replace(regexp_replace("description", '^\s*\[TASK\]\s*', ''), '\s*\[(?:Deadline|Hạn chót):\s*\d{4}-\d{2}-\d{2}(?:\s+[0-2][0-9]:[0-5][0-9])?\]', '', 'gi')), '')
WHERE "source_type" = 'TASK';
