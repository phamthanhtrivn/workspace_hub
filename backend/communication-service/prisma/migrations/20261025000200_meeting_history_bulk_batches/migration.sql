BEGIN;
ALTER TABLE "meeting_history_preferences" ADD COLUMN "hidden_batch_id" UUID;
CREATE INDEX "meeting_history_preferences_user_id_hidden_batch_id_idx"
    ON "meeting_history_preferences"("user_id", "hidden_batch_id");
COMMIT;
