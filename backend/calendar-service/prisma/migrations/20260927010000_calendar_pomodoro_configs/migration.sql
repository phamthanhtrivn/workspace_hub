CREATE TABLE "calendar_pomodoro_configs" (
  "user_id" UUID NOT NULL,
  "focus_duration" INTEGER NOT NULL DEFAULT 25,
  "short_break" INTEGER NOT NULL DEFAULT 5,
  "long_break" INTEGER NOT NULL DEFAULT 15,
  "long_break_interval" INTEGER NOT NULL DEFAULT 4,
  "auto_start_break" BOOLEAN NOT NULL DEFAULT FALSE,
  "auto_start_focus" BOOLEAN NOT NULL DEFAULT FALSE,
  "sound_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "sound_type" VARCHAR(20) NOT NULL DEFAULT 'chime',
  "sound_volume" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "notification_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "daily_goal_pomodoros" INTEGER NOT NULL DEFAULT 8,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "calendar_pomodoro_configs_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "calendar_pomodoro_configs_durations_check" CHECK (
    "focus_duration" BETWEEN 1 AND 240 AND "short_break" BETWEEN 0 AND 120
    AND "long_break" BETWEEN 0 AND 240 AND "long_break_interval" BETWEEN 1 AND 20
  ),
  CONSTRAINT "calendar_pomodoro_configs_sound_check" CHECK (
    "sound_type" IN ('chime', 'bell', 'digital') AND "sound_volume" BETWEEN 0 AND 1
  ),
  CONSTRAINT "calendar_pomodoro_configs_goal_check" CHECK ("daily_goal_pomodoros" BETWEEN 1 AND 100)
);

ALTER TABLE "calendar_pomodoro_sessions"
  ADD COLUMN "client_session_id" VARCHAR(100),
  ADD COLUMN "task_title" VARCHAR(500),
  ADD COLUMN "project_id" UUID,
  ADD COLUMN "project_name" VARCHAR(500);

CREATE UNIQUE INDEX "calendar_pomodoro_sessions_user_id_client_session_id_key"
  ON "calendar_pomodoro_sessions"("user_id", "client_session_id");

CREATE TYPE "PomodoroTimerStatus" AS ENUM ('IDLE', 'RUNNING', 'PAUSED');

CREATE TABLE "calendar_pomodoro_timer_states" (
  "user_id" UUID NOT NULL,
  "mode" "PomodoroSessionType" NOT NULL,
  "status" "PomodoroTimerStatus" NOT NULL,
  "target_end_at" TIMESTAMPTZ(3),
  "remaining_seconds" INTEGER NOT NULL,
  "cycle_count" INTEGER NOT NULL,
  "session_start_at" TIMESTAMPTZ(3),
  "event_id" UUID,
  "task_id" UUID,
  "active_task" JSONB,
  "notes" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "calendar_pomodoro_timer_states_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "calendar_pomodoro_timer_states_values_check" CHECK (
    "remaining_seconds" BETWEEN 0 AND 86400 AND "cycle_count" BETWEEN 0 AND 100000 AND "version" > 0
  ),
  CONSTRAINT "calendar_pomodoro_timer_states_running_check" CHECK (
    "status" <> 'RUNNING' OR ("target_end_at" IS NOT NULL AND "session_start_at" IS NOT NULL)
  )
);
