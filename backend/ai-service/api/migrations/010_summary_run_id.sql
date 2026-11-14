BEGIN;
ALTER TABLE notebook_ai.artifacts ADD COLUMN IF NOT EXISTS run_id uuid;
COMMIT;
