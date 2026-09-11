-- AlterEnum
ALTER TYPE "MeetingParticipantStatus" ADD VALUE 'REQUESTED';
ALTER TYPE "MeetingParticipantStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN "allow_join_without_approval" BOOLEAN NOT NULL DEFAULT false;
