CREATE INDEX "meeting_events_recording_attendees_idx"
ON "meeting_events"("meeting_id", "actor_id", "type", "created_at");
