ALTER TABLE "calendar_pomodoro_configs"
  ADD COLUMN "ambient_track_id" VARCHAR(128) NOT NULL DEFAULT 'lofi_relax',
  ADD COLUMN "ambient_volume" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  ADD COLUMN "ambient_auto_play_on_focus" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD CONSTRAINT "calendar_pomodoro_configs_ambient_volume_check"
    CHECK ("ambient_volume" BETWEEN 0 AND 1),
  ADD CONSTRAINT "calendar_pomodoro_configs_ambient_track_check"
    CHECK ("ambient_track_id" ~ '^(none|lofi_relax|gentle_piano|rain_heavy|ocean_waves|coffee_shop|forest_wind|alpha_drone_432hz|custom_[A-Za-z0-9_-]+)$');
