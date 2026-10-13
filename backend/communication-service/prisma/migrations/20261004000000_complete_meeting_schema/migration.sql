-- Reconcile missing schema changes with the current meeting domain.
CREATE TYPE "MeetingMessageType" AS ENUM ('TEXT', 'SYSTEM', 'AI', 'DOCUMENT');
DROP INDEX "meeting_messages_pinned_idx";
ALTER TABLE "meeting_messages" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "meeting_messages" ALTER COLUMN "type" TYPE "MeetingMessageType"
    USING ("type"::text::"MeetingMessageType");
ALTER TABLE "meeting_messages" ALTER COLUMN "type" SET DEFAULT 'TEXT';
ALTER TABLE "meeting_messages" DROP COLUMN "pinned";
ALTER TABLE "meeting_recordings" DROP COLUMN "error_message";
ALTER TABLE "meetings" DROP COLUMN "has_password",
    ADD COLUMN "channel_id" UUID,
    ADD COLUMN "conversation_id" UUID,
    ALTER COLUMN "auto_admit" SET DEFAULT false;
ALTER TABLE "messages" ADD COLUMN "meeting_id" UUID;
ALTER TABLE "direct_messages" ADD COLUMN "meeting_id" UUID;
CREATE INDEX "meetings_channel_id_idx" ON "meetings"("channel_id");
CREATE INDEX "meetings_conversation_id_idx" ON "meetings"("conversation_id");
ALTER TABLE "messages" ADD CONSTRAINT "messages_meeting_id_fkey"
    FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_meeting_id_fkey"
    FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_channel_id_fkey"
    FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "direct_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER INDEX "meeting_participant_view_preferences_meeting_id_target_user_id_"
    RENAME TO "meeting_participant_view_preferences_meeting_id_target_user_idx";
ALTER INDEX "meeting_participant_view_preferences_meeting_id_viewer_user_id_"
    RENAME TO "meeting_participant_view_preferences_meeting_id_viewer_user_idx";
