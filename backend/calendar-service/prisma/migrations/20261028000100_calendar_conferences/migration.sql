ALTER TABLE calendar_events ADD COLUMN conference_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE recurrence_series ADD COLUMN conference_enabled BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE calendar_conferences (
  event_id UUID PRIMARY KEY, calendar_id UUID NOT NULL, host_id UUID NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true, revision BIGINT NOT NULL DEFAULT 1,
  signature TEXT NOT NULL, payload JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING',
  meeting_id UUID, join_token TEXT, last_error TEXT, attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX calendar_conferences_status_next_attempt_at_idx ON calendar_conferences(status, next_attempt_at);
CREATE INDEX calendar_conferences_calendar_id_idx ON calendar_conferences(calendar_id);
