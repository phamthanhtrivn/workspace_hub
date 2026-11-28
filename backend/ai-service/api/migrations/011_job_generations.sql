BEGIN;
ALTER TABLE notebook_ai.sources ADD COLUMN IF NOT EXISTS run_id uuid;
ALTER TABLE notebook_ai.requests ADD COLUMN IF NOT EXISTS artifact_run_id uuid;
UPDATE notebook_ai.artifacts SET run_id=gen_random_uuid() WHERE run_id IS NULL;
COMMIT;
