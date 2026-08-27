DO $$ BEGIN CREATE TYPE "EventSourceType" AS ENUM ('USER', 'TASK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReminderDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'DISPATCHED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "calendar_events"
  ADD COLUMN IF NOT EXISTS "recurrence_parent_id" UUID,
  ADD COLUMN IF NOT EXISTS "original_start_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "recurrence_generated_until" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "source_type" "EventSourceType" NOT NULL DEFAULT 'USER',
  ADD COLUMN IF NOT EXISTS "source_id" UUID;

DO $$ BEGIN
  ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_recurrence_parent_id_fkey"
  FOREIGN KEY ("recurrence_parent_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "reminders"
  ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "delivery_status" "ReminderDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "next_attempt_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dispatched_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_error" TEXT;

UPDATE "reminders" AS reminder
SET "scheduled_at" = event."start_at" - (reminder."minutes_before" * INTERVAL '1 minute')
FROM "calendar_events" AS event
WHERE reminder."event_id" = event."id" AND reminder."scheduled_at" IS NULL;
ALTER TABLE "reminders" ALTER COLUMN "scheduled_at" SET NOT NULL;

WITH ranked_defaults AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "owner_user_id" ORDER BY "created_at", "id") AS position
  FROM "calendars" WHERE "is_default" = true
)
UPDATE "calendars" AS calendar SET "is_default" = false
FROM ranked_defaults
WHERE calendar."id" = ranked_defaults."id" AND ranked_defaults.position > 1;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "calendars" WHERE "project_id" IS NOT NULL
    GROUP BY "owner_user_id", "project_id" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate project calendars detected; merge them explicitly before applying this migration';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "calendars_one_default_per_owner_key"
  ON "calendars"("owner_user_id") WHERE "is_default" = true;
CREATE UNIQUE INDEX IF NOT EXISTS "calendars_owner_user_id_project_id_key"
  ON "calendars"("owner_user_id", "project_id");
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_events_recurrence_parent_id_original_start_at_key"
  ON "calendar_events"("recurrence_parent_id", "original_start_at");
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_events_calendar_id_source_type_source_id_key"
  ON "calendar_events"("calendar_id", "source_type", "source_id");
CREATE INDEX IF NOT EXISTS "calendar_events_recurrence_parent_id_start_at_idx"
  ON "calendar_events"("recurrence_parent_id", "start_at");
CREATE INDEX IF NOT EXISTS "calendar_events_source_type_source_id_idx"
  ON "calendar_events"("source_type", "source_id");
CREATE INDEX IF NOT EXISTS "reminders_delivery_status_scheduled_at_next_attempt_at_idx"
  ON "reminders"("delivery_status", "scheduled_at", "next_attempt_at");
