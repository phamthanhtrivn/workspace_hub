-- CreateTable
CREATE TABLE "meeting_participant_view_preferences" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "viewer_user_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "audio_muted" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_participant_view_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meeting_participant_view_preferences_meeting_id_viewer_user_id_target_user_id_key" ON "meeting_participant_view_preferences"("meeting_id", "viewer_user_id", "target_user_id");

-- CreateIndex
CREATE INDEX "meeting_participant_view_preferences_meeting_id_viewer_user_id_idx" ON "meeting_participant_view_preferences"("meeting_id", "viewer_user_id");

-- CreateIndex
CREATE INDEX "meeting_participant_view_preferences_meeting_id_target_user_id_idx" ON "meeting_participant_view_preferences"("meeting_id", "target_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_participant_view_preferences_single_pin_idx" ON "meeting_participant_view_preferences"("meeting_id", "viewer_user_id") WHERE "pinned" = true;

-- AddForeignKey
ALTER TABLE "meeting_participant_view_preferences" ADD CONSTRAINT "meeting_participant_view_preferences_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
