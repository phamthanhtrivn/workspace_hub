BEGIN;
CREATE TABLE IF NOT EXISTS notebook_ai.cleanup_outbox (
 id uuid PRIMARY KEY, scope_id uuid NOT NULL, source_id uuid,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notebook_ai.requests ADD COLUMN IF NOT EXISTS artifact_id uuid REFERENCES notebook_ai.artifacts(id) ON DELETE SET NULL;
COMMIT;
