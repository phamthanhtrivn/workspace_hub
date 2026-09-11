-- AlterTable
ALTER TABLE "meeting_participants"
ADD COLUMN "chat_muted" BOOLEAN NOT NULL DEFAULT false;
