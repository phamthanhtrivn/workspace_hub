ALTER TABLE notification_outbox
    DROP CONSTRAINT chk_notification_outbox_status;

ALTER TABLE notification_outbox
    ADD CONSTRAINT chk_notification_outbox_status
    CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD'));
