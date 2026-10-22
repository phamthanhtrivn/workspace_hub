DROP INDEX IF EXISTS "meeting_recordings_one_active";
CREATE UNIQUE INDEX "meeting_recordings_one_active"
ON "meeting_recordings"("meeting_id")
WHERE "status" IN ('STARTING', 'RECORDING', 'PAUSING', 'PAUSED', 'PROCESSING');
