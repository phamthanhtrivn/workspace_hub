CREATE TABLE notification_outbox (
    id UUID PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    CONSTRAINT chk_notification_outbox_status
        CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
    CONSTRAINT chk_notification_outbox_attempt_count CHECK (attempt_count >= 0)
);

CREATE INDEX idx_notification_outbox_pending
    ON notification_outbox (status, next_attempt_at, created_at)
    WHERE status IN ('PENDING', 'FAILED', 'PROCESSING');
