ALTER TABLE notebook_ai.sources ADD COLUMN snapshot_id uuid;
CREATE UNIQUE INDEX sources_snapshot_id ON notebook_ai.sources(snapshot_id) WHERE snapshot_id IS NOT NULL;
ALTER TABLE notebook_ai.cleanup_outbox ADD COLUMN snapshot_cleanup jsonb NOT NULL DEFAULT '[]'::jsonb;
