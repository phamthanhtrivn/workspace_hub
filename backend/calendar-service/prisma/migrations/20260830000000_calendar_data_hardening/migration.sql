DO $$ BEGIN
  CREATE TYPE "RecurrenceExceptionType" AS ENUM ('EXCLUDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "ReminderDeliveryStatus" ADD VALUE IF NOT EXISTS 'DEAD_LETTER';

ALTER TABLE "calendars"
  ADD COLUMN "time_zone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh';

ALTER TABLE "calendar_events"
  ADD COLUMN "is_recurrence_override" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "calendar_event_documents" (
  "event_id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "calendar_event_documents_pkey" PRIMARY KEY ("event_id", "document_id"),
  CONSTRAINT "calendar_event_documents_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "recurrence_exceptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "series_id" UUID NOT NULL,
  "occurrence_start" TIMESTAMPTZ(3) NOT NULL,
  "type" "RecurrenceExceptionType" NOT NULL DEFAULT 'EXCLUDED',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recurrence_exceptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recurrence_exceptions_series_id_fkey"
    FOREIGN KEY ("series_id") REFERENCES "calendar_events"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "recurrence_exceptions_series_id_occurrence_start_key"
    UNIQUE ("series_id", "occurrence_start")
);

CREATE TABLE "task_calendar_sync_checkpoints" (
  "task_id" UUID NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "event_type" TEXT NOT NULL,
  "synced_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_calendar_sync_checkpoints_pkey" PRIMARY KEY ("task_id")
);

INSERT INTO "calendar_event_documents" ("event_id", "document_id")
SELECT event."id", document_id
FROM "calendar_events" AS event
CROSS JOIN LATERAL unnest(event."document_ids") AS document_id
ON CONFLICT DO NOTHING;

INSERT INTO "recurrence_exceptions" ("series_id", "occurrence_start")
SELECT event."id", exception_date AT TIME ZONE 'UTC'
FROM "calendar_events" AS event
CROSS JOIN LATERAL unnest(event."exception_dates") AS exception_date
WHERE event."recurrence_parent_id" IS NULL
ON CONFLICT DO NOTHING;

ALTER TABLE "calendar_events"
  DROP COLUMN "document_ids",
  DROP COLUMN "exception_dates";

DELETE FROM "calendar_events"
WHERE "recurrence_parent_id" IS NOT NULL
  AND "is_recurrence_override" = false
  AND "start_at" > CURRENT_TIMESTAMP + INTERVAL '180 days';

UPDATE "calendar_events"
SET "recurrence_generated_until" = NULL
WHERE "recurrence_rule" IS NOT NULL
  AND "recurrence_parent_id" IS NULL;

ALTER TABLE "calendars"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "calendar_events"
  ALTER COLUMN "start_at" TYPE TIMESTAMPTZ(3) USING "start_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "end_at" TYPE TIMESTAMPTZ(3) USING "end_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "original_start_at" TYPE TIMESTAMPTZ(3) USING "original_start_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "recurrence_generated_until" TYPE TIMESTAMPTZ(3) USING "recurrence_generated_until" AT TIME ZONE 'UTC',
  ALTER COLUMN "cancelled_at" TYPE TIMESTAMPTZ(3) USING "cancelled_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "calendar_event_attendees"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "reminders"
  ALTER COLUMN "scheduled_at" TYPE TIMESTAMPTZ(3) USING "scheduled_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "next_attempt_at" TYPE TIMESTAMPTZ(3) USING "next_attempt_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "dispatched_at" TYPE TIMESTAMPTZ(3) USING "dispatched_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "user_profile_snapshots"
  ALTER COLUMN "synced_at" TYPE TIMESTAMPTZ(3) USING "synced_at" AT TIME ZONE 'UTC';

CREATE INDEX "calendar_event_documents_document_id_idx"
  ON "calendar_event_documents"("document_id");
CREATE INDEX "recurrence_exceptions_series_id_occurrence_start_idx"
  ON "recurrence_exceptions"("series_id", "occurrence_start");
CREATE INDEX "task_calendar_sync_checkpoints_occurred_at_idx"
  ON "task_calendar_sync_checkpoints"("occurred_at");
