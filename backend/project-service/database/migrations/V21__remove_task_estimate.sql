-- Estimates are no longer part of the project task contract.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS chk_tasks_estimated_minutes;
ALTER TABLE tasks DROP COLUMN IF EXISTS estimated_minutes;
