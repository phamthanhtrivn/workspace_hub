ALTER TABLE "direct_conversation_participants"
    ADD COLUMN IF NOT EXISTS "draft_opened_at" TIMESTAMP(3);
