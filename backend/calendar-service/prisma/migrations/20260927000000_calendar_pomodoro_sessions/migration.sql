CREATE TYPE "PomodoroSessionType" AS ENUM ('FOCUS', 'SHORT_BREAK', 'LONG_BREAK');
CREATE TYPE "PomodoroSessionStatus" AS ENUM ('COMPLETED', 'STOPPED', 'SKIPPED');

CREATE TABLE "calendar_pomodoro_sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "event_id" UUID,
  "task_id" UUID,
  "session_type" "PomodoroSessionType" NOT NULL,
  "status" "PomodoroSessionStatus" NOT NULL,
  "started_at" TIMESTAMPTZ(3) NOT NULL,
  "ended_at" TIMESTAMPTZ(3) NOT NULL,
  "planned_seconds" INTEGER NOT NULL,
  "actual_seconds" INTEGER NOT NULL,
  "notes" TEXT,
  "interruption_reason" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "calendar_pomodoro_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "calendar_pomodoro_sessions_duration_check" CHECK ("planned_seconds" > 0 AND "actual_seconds" >= 0),
  CONSTRAINT "calendar_pomodoro_sessions_dates_check" CHECK ("ended_at" >= "started_at"),
  CONSTRAINT "calendar_pomodoro_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "calendar_pomodoro_sessions_user_id_started_at_idx" ON "calendar_pomodoro_sessions"("user_id", "started_at");
CREATE INDEX "calendar_pomodoro_sessions_event_id_started_at_idx" ON "calendar_pomodoro_sessions"("event_id", "started_at");
CREATE INDEX "calendar_pomodoro_sessions_task_id_started_at_idx" ON "calendar_pomodoro_sessions"("task_id", "started_at");
