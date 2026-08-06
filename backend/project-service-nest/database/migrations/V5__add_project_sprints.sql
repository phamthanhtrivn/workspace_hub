CREATE TABLE IF NOT EXISTS project_sprints (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    goal TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_project_sprints_status CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED')),
    CONSTRAINT ck_project_sprints_date_range CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_sprint'
    ) THEN
        ALTER TABLE tasks
            ADD CONSTRAINT fk_tasks_sprint
            FOREIGN KEY (sprint_id) REFERENCES project_sprints(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_project_sprints_project_status_start
    ON project_sprints (project_id, status, start_date);

CREATE INDEX IF NOT EXISTS idx_tasks_project_sprint_archived
    ON tasks (project_id, sprint_id, archived);

CREATE UNIQUE INDEX IF NOT EXISTS uk_project_sprints_one_active
    ON project_sprints (project_id)
    WHERE status = 'ACTIVE';
