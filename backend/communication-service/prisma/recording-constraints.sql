CREATE UNIQUE INDEX IF NOT EXISTS "meeting_recordings_one_active"
ON "meeting_recordings"("meeting_id")
WHERE "status" IN ('STARTING', 'RECORDING', 'PROCESSING');
