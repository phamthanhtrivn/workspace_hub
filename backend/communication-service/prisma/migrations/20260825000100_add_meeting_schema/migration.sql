-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('INSTANT', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MeetingRole" AS ENUM ('HOST', 'COHOST', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "MeetingParticipantStatus" AS ENUM ('INVITED', 'JOINED', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "MeetingRecordingStatus" AS ENUM ('STARTING', 'RECORDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "MeetingEventType" AS ENUM ('CREATED', 'STARTED', 'ENDED', 'CANCELLED', 'PARTICIPANT_JOINED', 'PARTICIPANT_LEFT', 'RECORDING_STARTED', 'RECORDING_STOPPED', 'RECORDING_COMPLETED', 'SCREEN_SHARE_STARTED', 'SCREEN_SHARE_STOPPED');

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL,
    "room_name" TEXT NOT NULL,
    "join_token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MeetingType" NOT NULL,
    "status" "MeetingStatus" NOT NULL,
    "created_by" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "scheduled_start_at" TIMESTAMP(3),
    "scheduled_end_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "has_password" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_participants" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MeetingRole" NOT NULL,
    "status" "MeetingParticipantStatus" NOT NULL,
    "invited_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_messages" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "meeting_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_recordings" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "started_by" UUID NOT NULL,
    "stopped_by" UUID,
    "status" "MeetingRecordingStatus" NOT NULL,
    "livekit_egress_id" TEXT,
    "s3_key" TEXT,
    "file_name" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "duration_seconds" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stopped_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "meeting_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_events" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "actor_id" UUID,
    "type" "MeetingEventType" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meetings_room_name_key" ON "meetings"("room_name");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_join_token_key" ON "meetings"("join_token");

-- CreateIndex
CREATE INDEX "meetings_created_by_idx" ON "meetings"("created_by");

-- CreateIndex
CREATE INDEX "meetings_host_id_idx" ON "meetings"("host_id");

-- CreateIndex
CREATE INDEX "meetings_status_idx" ON "meetings"("status");

-- CreateIndex
CREATE INDEX "meetings_scheduled_start_at_idx" ON "meetings"("scheduled_start_at");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_participants_meeting_id_user_id_key" ON "meeting_participants"("meeting_id", "user_id");

-- CreateIndex
CREATE INDEX "meeting_participants_user_id_idx" ON "meeting_participants"("user_id");

-- CreateIndex
CREATE INDEX "meeting_participants_meeting_id_status_idx" ON "meeting_participants"("meeting_id", "status");

-- CreateIndex
CREATE INDEX "meeting_messages_meeting_id_created_at_idx" ON "meeting_messages"("meeting_id", "created_at");

-- CreateIndex
CREATE INDEX "meeting_messages_sender_id_idx" ON "meeting_messages"("sender_id");

-- CreateIndex
CREATE INDEX "meeting_recordings_meeting_id_started_at_idx" ON "meeting_recordings"("meeting_id", "started_at");

-- CreateIndex
CREATE INDEX "meeting_recordings_status_idx" ON "meeting_recordings"("status");

-- CreateIndex
CREATE INDEX "meeting_events_meeting_id_created_at_idx" ON "meeting_events"("meeting_id", "created_at");

-- AddForeignKey
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_messages" ADD CONSTRAINT "meeting_messages_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_recordings" ADD CONSTRAINT "meeting_recordings_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_events" ADD CONSTRAINT "meeting_events_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
