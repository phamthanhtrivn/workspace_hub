ALTER TABLE "meeting_participants"
  ADD COLUMN "recording_request_id" UUID,
  ADD COLUMN "recording_requested_at" TIMESTAMP(3),
  ADD COLUMN "recording_request_state" TEXT;

CREATE UNIQUE INDEX "meeting_participants_recording_request_id_key"
  ON "meeting_participants"("recording_request_id");
CREATE INDEX "meeting_participants_recording_requests_idx"
  ON "meeting_participants"("meeting_id", "recording_request_state", "recording_requested_at");
