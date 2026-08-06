ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "sender_name" TEXT,
  ADD COLUMN IF NOT EXISTS "sender_avatar" TEXT;
