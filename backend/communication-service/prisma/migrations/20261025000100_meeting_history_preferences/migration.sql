BEGIN;

CREATE TABLE "meeting_history_preferences" (
    "meeting_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "hidden_at" TIMESTAMP(3),
    CONSTRAINT "meeting_history_preferences_pkey" PRIMARY KEY ("meeting_id", "user_id")
);

CREATE INDEX "meeting_history_preferences_user_id_hidden_at_idx"
    ON "meeting_history_preferences"("user_id", "hidden_at");

ALTER TABLE "meeting_history_preferences"
    ADD CONSTRAINT "meeting_history_preferences_meeting_id_fkey"
    FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
