-- Add a lightweight display snapshot for meeting lists. Calendar remains
-- canonical for calendar event title/description/reminders.
ALTER TABLE "meetings"
  ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Untitled meeting';

CREATE INDEX "meetings_status_scheduled_start_at_created_by_idx"
  ON "meetings"("status", "scheduled_start_at", "created_by");
