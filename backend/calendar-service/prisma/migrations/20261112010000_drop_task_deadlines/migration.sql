ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "deadline_date", DROP COLUMN IF EXISTS "deadline_time";
ALTER TABLE "recurrence_series" DROP COLUMN IF EXISTS "deadline_date", DROP COLUMN IF EXISTS "deadline_time";
