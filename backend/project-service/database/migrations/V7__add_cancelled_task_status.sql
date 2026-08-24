ALTER TABLE tasks DROP CONSTRAINT IF EXISTS chk_tasks_status;
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_status
    CHECK (status IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS chk_tasks_completion_consistency;
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_completion_consistency
    CHECK ((status IN ('DONE', 'CANCELLED')) = (completed_at IS NOT NULL));
