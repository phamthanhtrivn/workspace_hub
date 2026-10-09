ALTER TABLE "meeting_participants" ADD COLUMN "can_record" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "record_granted_by" UUID;
ALTER TABLE "meeting_recordings" ADD COLUMN "owner_id" UUID,
 ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Meeting recording',
 ADD COLUMN "layout" TEXT NOT NULL DEFAULT 'speaker',
 ADD COLUMN "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "stop_requested_at" TIMESTAMP(3), ADD COLUMN "deleted_at" TIMESTAMP(3),
 ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "failure_code" TEXT, ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "egress_updated_at" BIGINT NOT NULL DEFAULT 0;
UPDATE "meeting_recordings" r SET "owner_id" = m."created_by", "title" = m."title",
 "requested_at" = r."started_at" FROM "meetings" m WHERE r."meeting_id" = m."id";
ALTER TABLE "meeting_recordings" ALTER COLUMN "owner_id" SET NOT NULL,
 ALTER COLUMN "size_bytes" TYPE BIGINT, ALTER COLUMN "started_at" DROP NOT NULL,
 ALTER COLUMN "started_at" DROP DEFAULT;
CREATE UNIQUE INDEX "meeting_recordings_livekit_egress_id_key" ON "meeting_recordings"("livekit_egress_id");
CREATE UNIQUE INDEX "meeting_recordings_one_active" ON "meeting_recordings"("meeting_id")
 WHERE "status" IN ('STARTING', 'RECORDING', 'PROCESSING');
CREATE INDEX "meeting_recordings_owner_id_requested_at_idx" ON "meeting_recordings"("owner_id", "requested_at");
CREATE TABLE "meeting_recording_permissions" (
 "id" UUID NOT NULL, "recording_id" UUID NOT NULL, "user_id" UUID NOT NULL, "granted_by" UUID NOT NULL,
 "can_download" BOOLEAN NOT NULL DEFAULT false, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "meeting_recording_permissions_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "meeting_recording_permissions_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "meeting_recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "meeting_recording_permissions_recording_id_user_id_key" ON "meeting_recording_permissions"("recording_id", "user_id");
CREATE INDEX "meeting_recording_permissions_user_id_idx" ON "meeting_recording_permissions"("user_id");
CREATE TABLE "meeting_recording_jobs" (
 "id" UUID NOT NULL, "recording_id" UUID NOT NULL, "kind" TEXT NOT NULL, "state" TEXT NOT NULL DEFAULT 'PENDING',
 "attempts" INTEGER NOT NULL DEFAULT 0, "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "lease_until" TIMESTAMP(3), "lease_token" TEXT, "dispatched_at" TIMESTAMP(3), "request_key" TEXT, "request_hash" TEXT,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "meeting_recording_jobs_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "meeting_recording_jobs_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "meeting_recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "meeting_recording_jobs_request_key_key" ON "meeting_recording_jobs"("request_key");
CREATE UNIQUE INDEX "meeting_recording_jobs_recording_id_kind_key" ON "meeting_recording_jobs"("recording_id", "kind");
CREATE INDEX "meeting_recording_jobs_state_next_attempt_at_idx" ON "meeting_recording_jobs"("state", "next_attempt_at");
