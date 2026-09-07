-- Recurring event roots used to be both templates and visible occurrences.
-- Existing calendar data is intentionally reset for this breaking model change.
TRUNCATE TABLE "calendar_events" CASCADE;

DROP TABLE IF EXISTS "recurrence_exceptions" CASCADE;

ALTER TABLE "calendar_events"
  DROP CONSTRAINT IF EXISTS "calendar_events_recurrence_parent_id_fkey",
  DROP COLUMN IF EXISTS "recurrence_rule",
  DROP COLUMN IF EXISTS "recurrence_parent_id",
  DROP COLUMN IF EXISTS "recurrence_generated_until",
  ADD COLUMN "recurrence_series_id" UUID;

DROP INDEX IF EXISTS "calendar_events_recurrence_parent_id_original_start_at_key";
DROP INDEX IF EXISTS "calendar_events_recurrence_parent_id_start_at_idx";

CREATE TABLE "recurrence_series" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "calendar_id" UUID NOT NULL,
  "created_by" UUID NOT NULL,
  "updated_by" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "start_at" TIMESTAMPTZ(3) NOT NULL,
  "end_at" TIMESTAMPTZ(3) NOT NULL,
  "all_day" BOOLEAN NOT NULL DEFAULT false,
  "color" TEXT,
  "status" "EventStatus" NOT NULL DEFAULT 'CONFIRMED',
  "visibility" "EventVisibility" NOT NULL DEFAULT 'DEFAULT',
  "recurrence_rule" TEXT NOT NULL,
  "time_zone" TEXT NOT NULL,
  "recurrence_generated_until" TIMESTAMPTZ(3),
  "cancelled_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recurrence_series_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recurrence_series_calendar_id_fkey"
    FOREIGN KEY ("calendar_id") REFERENCES "calendars"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "recurrence_series_attendees" (
  "series_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "optional" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recurrence_series_attendees_pkey" PRIMARY KEY ("series_id", "user_id"),
  CONSTRAINT "recurrence_series_attendees_series_id_fkey"
    FOREIGN KEY ("series_id") REFERENCES "recurrence_series"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "recurrence_series_reminders" (
  "series_id" UUID NOT NULL,
  "minutes_before" INTEGER NOT NULL,
  "method" "ReminderMethod" NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recurrence_series_reminders_pkey"
    PRIMARY KEY ("series_id", "method", "minutes_before"),
  CONSTRAINT "recurrence_series_reminders_series_id_fkey"
    FOREIGN KEY ("series_id") REFERENCES "recurrence_series"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "recurrence_series_documents" (
  "series_id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recurrence_series_documents_pkey" PRIMARY KEY ("series_id", "document_id"),
  CONSTRAINT "recurrence_series_documents_series_id_fkey"
    FOREIGN KEY ("series_id") REFERENCES "recurrence_series"("id")
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
    FOREIGN KEY ("series_id") REFERENCES "recurrence_series"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "recurrence_exceptions_series_id_occurrence_start_key"
    UNIQUE ("series_id", "occurrence_start")
);

ALTER TABLE "calendar_events"
  ADD CONSTRAINT "calendar_events_recurrence_series_id_fkey"
  FOREIGN KEY ("recurrence_series_id") REFERENCES "recurrence_series"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "calendar_events_recurrence_series_id_original_start_at_key"
  ON "calendar_events"("recurrence_series_id", "original_start_at");
CREATE INDEX "calendar_events_recurrence_series_id_start_at_idx"
  ON "calendar_events"("recurrence_series_id", "start_at");
CREATE INDEX "recurrence_series_calendar_id_idx"
  ON "recurrence_series"("calendar_id");
CREATE INDEX "recurrence_series_status_recurrence_generated_until_idx"
  ON "recurrence_series"("status", "recurrence_generated_until");
CREATE INDEX "recurrence_series_attendees_user_id_idx"
  ON "recurrence_series_attendees"("user_id");
CREATE INDEX "recurrence_series_documents_document_id_idx"
  ON "recurrence_series_documents"("document_id");
CREATE INDEX "recurrence_exceptions_series_id_occurrence_start_idx"
  ON "recurrence_exceptions"("series_id", "occurrence_start");
