CREATE TABLE document_notification_outbox (
  id UUID PRIMARY KEY,
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  lease_token UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX document_notification_outbox_ready_idx ON document_notification_outbox(next_attempt_at);
