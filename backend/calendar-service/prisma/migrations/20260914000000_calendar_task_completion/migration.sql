ALTER TABLE "recurrence_series"
  ADD COLUMN "source_type" "EventSourceType" NOT NULL DEFAULT 'USER';

ALTER TABLE "calendar_events"
  ADD COLUMN "completed_at" TIMESTAMPTZ(3);

-- Preserve tasks created before recurrence series tracked their source type.
UPDATE "recurrence_series"
SET "source_type" = 'TASK'
WHERE "description" LIKE '[TASK]%';

UPDATE "calendar_events"
SET "source_type" = 'TASK'
WHERE "description" LIKE '[TASK]%'
   OR "recurrence_series_id" IN (
     SELECT "id"
     FROM "recurrence_series"
     WHERE "source_type" = 'TASK'
   );
