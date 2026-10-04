CREATE TYPE "PomodoroAudioCategory" AS ENUM ('music', 'nature', 'ambient');

CREATE TABLE "calendar_pomodoro_audios" (
  "id" VARCHAR(128) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT NOT NULL,
  "icon" VARCHAR(64) NOT NULL,
  "category" "PomodoroAudioCategory" NOT NULL,
  "s3_key" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "calendar_pomodoro_audios_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "calendar_pomodoro_audios_id_check" CHECK (
    "id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'
    AND "id" <> 'none' AND "id" NOT LIKE 'custom\_%' ESCAPE '\'
  ),
  CONSTRAINT "calendar_pomodoro_audios_s3_key_check" CHECK (
    length(trim("s3_key")) > 0 AND "s3_key" !~ '^(/|[A-Za-z][A-Za-z0-9+.-]*:)'
    AND "s3_key" !~ '(^|/)\.\.?(/|$)'
  )
);

CREATE INDEX "calendar_pomodoro_audios_is_active_sort_order_id_idx"
  ON "calendar_pomodoro_audios" ("is_active", "sort_order", "id");

UPDATE "calendar_pomodoro_configs"
  SET "ambient_track_id" = 'none'
  WHERE "ambient_track_id" LIKE 'custom\_%' ESCAPE '\';

ALTER TABLE "calendar_pomodoro_configs"
  DROP CONSTRAINT "calendar_pomodoro_configs_ambient_track_check",
  ADD CONSTRAINT "calendar_pomodoro_configs_ambient_track_check" CHECK (
    "ambient_track_id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'
    AND "ambient_track_id" NOT LIKE 'custom\_%' ESCAPE '\'
  );
