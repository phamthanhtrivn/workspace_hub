ALTER TYPE "MeetingRecordingStatus" ADD VALUE IF NOT EXISTS 'PAUSING';
ALTER TYPE "MeetingRecordingStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TABLE "meetings" ADD COLUMN "auto_record" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "recording_layout" TEXT NOT NULL DEFAULT 'speaker';
ALTER TABLE "meeting_recordings" ADD COLUMN "segment_key" TEXT,
 ADD COLUMN "segment_index" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "segment_started_at" TIMESTAMP(3),
 ADD COLUMN "segment_duration_seconds" DOUBLE PRECISION,
 ADD COLUMN "pause_requested_at" TIMESTAMP(3),
 ADD COLUMN "control_requested_by" UUID;
CREATE TABLE "meeting_recording_segments" (
 "id" UUID NOT NULL,
 "recording_id" UUID NOT NULL,
 "index" INTEGER NOT NULL,
 "s3_key" TEXT NOT NULL,
 "livekit_egress_id" TEXT NOT NULL,
 "size_bytes" BIGINT NOT NULL,
 "duration_seconds" DOUBLE PRECISION NOT NULL,
 "started_at" TIMESTAMP(3),
 "stopped_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "meeting_recording_segments_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "meeting_recording_segments_recording_id_fkey" FOREIGN KEY ("recording_id")
 REFERENCES "meeting_recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "meeting_recording_segments_s3_key_key" ON "meeting_recording_segments"("s3_key");
CREATE UNIQUE INDEX "meeting_recording_segments_livekit_egress_id_key" ON "meeting_recording_segments"("livekit_egress_id");
CREATE UNIQUE INDEX "meeting_recording_segments_recording_id_index_key" ON "meeting_recording_segments"("recording_id", "index");
