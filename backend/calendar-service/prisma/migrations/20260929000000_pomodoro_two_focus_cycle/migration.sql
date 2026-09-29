ALTER TABLE "calendar_pomodoro_configs"
  DROP CONSTRAINT "calendar_pomodoro_configs_durations_check";

UPDATE "calendar_pomodoro_configs"
SET "long_break_interval" = 2
WHERE "long_break_interval" IN (1, 4);

ALTER TABLE "calendar_pomodoro_configs"
  ALTER COLUMN "long_break_interval" SET DEFAULT 2;

ALTER TABLE "calendar_pomodoro_configs"
  ADD CONSTRAINT "calendar_pomodoro_configs_durations_check" CHECK (
    "focus_duration" BETWEEN 1 AND 240
    AND "short_break" BETWEEN 0 AND 120
    AND "long_break" BETWEEN 0 AND 240
    AND "long_break_interval" BETWEEN 2 AND 20
  );
