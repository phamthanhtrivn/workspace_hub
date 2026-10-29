ALTER TABLE meeting_participants ADD COLUMN requires_readmission BOOLEAN NOT NULL DEFAULT false;
UPDATE meeting_participants SET requires_readmission = true WHERE status = 'REMOVED';
