ALTER TYPE "MeetingParticipantStatus" ADD VALUE IF NOT EXISTS 'APPROVED';

ALTER TYPE "MeetingEventType" ADD VALUE IF NOT EXISTS 'AUTO_ADMIT_UPDATED';
ALTER TYPE "MeetingEventType" ADD VALUE IF NOT EXISTS 'JOIN_REQUESTED';
ALTER TYPE "MeetingEventType" ADD VALUE IF NOT EXISTS 'JOIN_REQUEST_APPROVED';
ALTER TYPE "MeetingEventType" ADD VALUE IF NOT EXISTS 'JOIN_REQUEST_REJECTED';

ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "auto_admit" BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'meetings'
      AND column_name = 'allow_join_without_approval'
  ) THEN
    UPDATE "meetings"
    SET "auto_admit" = "allow_join_without_approval"
    WHERE "allow_join_without_approval" IS NOT NULL;
  END IF;
END $$;

ALTER TABLE "meetings" DROP COLUMN IF EXISTS "allow_join_without_approval";
