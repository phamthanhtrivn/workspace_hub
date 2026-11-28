ALTER TABLE task_sync_outbox ADD COLUMN lease_token uuid;
ALTER TABLE task_sync_outbox ADD COLUMN lease_until timestamptz;
CREATE INDEX idx_task_outbox_aggregate_pending ON task_sync_outbox(task_id, version) WHERE delivered_at IS NULL;
ALTER TABLE notification_outbox ADD COLUMN lease_token uuid;
