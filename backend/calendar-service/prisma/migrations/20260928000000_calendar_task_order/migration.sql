ALTER TABLE "calendar_events"
ADD COLUMN "task_order" INTEGER;

CREATE INDEX "calendar_events_calendar_id_task_order_idx"
ON "calendar_events"("calendar_id", "task_order");
