ALTER TABLE "meeting_recording_jobs" ADD COLUMN IF NOT EXISTS "upload_state" JSONB;
CREATE INDEX IF NOT EXISTS "meeting_recording_jobs_kind_state_next_attempt_at_idx"
 ON "meeting_recording_jobs"("kind", "state", "next_attempt_at");
CREATE INDEX IF NOT EXISTS "meeting_recording_jobs_state_lease_until_idx"
 ON "meeting_recording_jobs"("state", "lease_until");
