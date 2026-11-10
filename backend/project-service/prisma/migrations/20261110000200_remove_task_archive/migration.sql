BEGIN;
DROP INDEX IF EXISTS idx_tasks_project_active_rank;
DROP INDEX IF EXISTS idx_tasks_project_sprint_archived;
ALTER TABLE tasks DROP COLUMN IF EXISTS archived;
CREATE INDEX IF NOT EXISTS idx_tasks_project_rank ON tasks (project_id, rank, created_at);
COMMIT;
