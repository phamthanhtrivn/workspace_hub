CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN CREATE TYPE "ReminderMethod" AS ENUM ('ALERT', 'PUSH', 'EMAIL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EventStatus" AS ENUM ('CONFIRMED', 'TENTATIVE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AttendeeResponseStatus" AS ENUM ('NEEDS_ACTION', 'ACCEPTED', 'DECLINED', 'TENTATIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EventVisibility" AS ENUM ('DEFAULT', 'PRIVATE', 'PUBLIC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "calendars" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "owner_user_id" UUID NOT NULL,
  "project_id" UUID, "name" TEXT NOT NULL, "icon" TEXT, "description" TEXT,
  "color" TEXT NOT NULL, "is_default" BOOLEAN NOT NULL DEFAULT false,
  "is_visible" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "calendars_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "calendar_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "calendar_id" UUID NOT NULL,
  "created_by" UUID NOT NULL, "updated_by" UUID, "title" TEXT NOT NULL,
  "description" TEXT, "location" TEXT, "start_at" TIMESTAMP(3) NOT NULL,
  "end_at" TIMESTAMP(3) NOT NULL, "all_day" BOOLEAN NOT NULL DEFAULT false,
  "color" TEXT, "status" "EventStatus" NOT NULL DEFAULT 'CONFIRMED',
  "visibility" "EventVisibility" NOT NULL DEFAULT 'DEFAULT', "recurrence_rule" TEXT,
  "exception_dates" TIMESTAMP(3)[] NOT NULL DEFAULT ARRAY[]::TIMESTAMP(3)[],
  "document_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[], "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "calendar_events_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "calendar_event_attendees" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "event_id" UUID NOT NULL, "user_id" UUID NOT NULL,
  "response_status" "AttendeeResponseStatus" NOT NULL DEFAULT 'NEEDS_ACTION',
  "optional" BOOLEAN NOT NULL DEFAULT false, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "calendar_event_attendees_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "calendar_event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "calendar_event_attendees_event_id_user_id_key" UNIQUE ("event_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "reminders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "event_id" UUID NOT NULL,
  "minutes_before" INTEGER NOT NULL, "method" "ReminderMethod" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reminders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "user_profile_snapshots" (
  "user_id" UUID NOT NULL, "email" TEXT, "full_name" TEXT, "avatar_url" TEXT,
  "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_profile_snapshots_pkey" PRIMARY KEY ("user_id")
);

CREATE INDEX IF NOT EXISTS "calendars_owner_user_id_idx" ON "calendars"("owner_user_id");
CREATE INDEX IF NOT EXISTS "calendars_project_id_idx" ON "calendars"("project_id");
CREATE INDEX IF NOT EXISTS "calendar_events_calendar_id_start_at_idx" ON "calendar_events"("calendar_id", "start_at");
CREATE INDEX IF NOT EXISTS "calendar_events_created_by_idx" ON "calendar_events"("created_by");
CREATE INDEX IF NOT EXISTS "calendar_events_start_at_end_at_idx" ON "calendar_events"("start_at", "end_at");
CREATE INDEX IF NOT EXISTS "calendar_event_attendees_user_id_idx" ON "calendar_event_attendees"("user_id");
CREATE INDEX IF NOT EXISTS "reminders_event_id_idx" ON "reminders"("event_id");
