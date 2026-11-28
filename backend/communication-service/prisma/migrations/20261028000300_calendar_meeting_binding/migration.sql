ALTER TABLE meetings ADD COLUMN calendar_event_id UUID UNIQUE;
ALTER TABLE meetings ADD COLUMN calendar_sync_revision BIGINT NOT NULL DEFAULT 0;
ALTER TABLE meetings ADD COLUMN calendar_cancelled BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE calendar_meeting_sync_states (event_id UUID PRIMARY KEY, revision BIGINT NOT NULL);
