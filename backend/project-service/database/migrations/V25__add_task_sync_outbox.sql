-- Project deployments use this SQL migration chain rather than Prisma migrations.
CREATE TABLE IF NOT EXISTS task_sync_outbox (
    id UUID NOT NULL,
    task_id UUID NOT NULL,
    version BIGINT NOT NULL,
    payload JSONB NOT NULL,
    delivered_at TIMESTAMP(3),
    next_attempt_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT task_sync_outbox_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS task_sync_outbox_task_id_version_key
    ON task_sync_outbox(task_id, version);
CREATE INDEX IF NOT EXISTS task_sync_outbox_delivered_at_next_attempt_at_idx
    ON task_sync_outbox(delivered_at, next_attempt_at);
