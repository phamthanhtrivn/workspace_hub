-- Keep delivered history first. Do not replay or reset any retained reminder.
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY event_id, method, minutes_before
    ORDER BY CASE WHEN delivery_status = 'DISPATCHED' THEN 0 ELSE 1 END, created_at, id
  ) AS position FROM reminders
)
DELETE FROM reminders USING ranked WHERE reminders.id = ranked.id AND ranked.position > 1;

CREATE UNIQUE INDEX "reminders_event_id_method_minutes_before_key"
  ON reminders(event_id, method, minutes_before);
