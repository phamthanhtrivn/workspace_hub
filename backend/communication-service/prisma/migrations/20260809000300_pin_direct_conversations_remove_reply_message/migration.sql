ALTER TABLE "direct_conversation_participants"
ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "messages"
DROP CONSTRAINT IF EXISTS "messages_reply_to_message_id_fkey";

ALTER TABLE "direct_messages"
DROP CONSTRAINT IF EXISTS "direct_messages_reply_to_message_id_fkey";

ALTER TABLE "messages"
DROP COLUMN IF EXISTS "reply_to_message_id";

ALTER TABLE "direct_messages"
DROP COLUMN IF EXISTS "reply_to_message_id";
