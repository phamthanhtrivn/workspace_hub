ALTER TABLE "meetings"
ADD COLUMN "screen_share_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "active_screen_share_user_id" UUID,
ADD COLUMN "screen_share_started_at" TIMESTAMP(3);

