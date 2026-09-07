ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'MEMBERS_ONLY';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

UPDATE projects SET visibility = 'MEMBERS_ONLY' WHERE visibility IS NULL;

ALTER TABLE projects ALTER COLUMN visibility SET DEFAULT 'MEMBERS_ONLY';
ALTER TABLE projects ALTER COLUMN visibility SET NOT NULL;
ALTER TABLE projects ADD CONSTRAINT chk_projects_visibility
    CHECK (visibility IN ('PRIVATE', 'MEMBERS_ONLY', 'PUBLIC'));
ALTER TABLE projects ADD CONSTRAINT chk_projects_date_order
    CHECK (due_date IS NULL OR start_date IS NULL OR start_date <= due_date);

UPDATE projects SET status = 'ARCHIVED' WHERE archived = TRUE AND status <> 'ARCHIVED';
UPDATE projects SET archived = TRUE WHERE status = 'ARCHIVED';
ALTER TABLE projects ADD CONSTRAINT chk_projects_archive_consistency
    CHECK ((status = 'ARCHIVED') = archived);

ALTER TABLE project_members ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

UPDATE project_members SET status = 'ACTIVE' WHERE status IS NULL;
UPDATE project_members SET updated_at = COALESCE(joined_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL;

ALTER TABLE project_members ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE project_members ALTER COLUMN status SET NOT NULL;
ALTER TABLE project_members ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE project_members ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE project_members ALTER COLUMN version SET DEFAULT 0;
ALTER TABLE project_members ALTER COLUMN version SET NOT NULL;
ALTER TABLE project_members ADD CONSTRAINT chk_project_members_status
    CHECK (status IN ('ACTIVE', 'LEFT', 'REMOVED'));

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_by UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE tasks
SET completed_at = COALESCE(completed_at, updated_at, created_at),
    completed_by = COALESCE(completed_by, created_by)
WHERE status = 'DONE' AND completed_at IS NULL;
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_completion_consistency
    CHECK ((status = 'DONE') = (completed_at IS NOT NULL));

ALTER TABLE task_assignees ADD COLUMN IF NOT EXISTS project_id UUID;
UPDATE task_assignees ta
SET project_id = t.project_id
FROM tasks t
WHERE ta.task_id = t.id
  AND ta.project_id IS NULL;
ALTER TABLE task_assignees ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE task_label_mappings ADD COLUMN IF NOT EXISTS project_id UUID;
UPDATE task_label_mappings tlm
SET project_id = t.project_id
FROM tasks t
WHERE tlm.task_id = t.id
  AND tlm.project_id IS NULL;
ALTER TABLE task_label_mappings ALTER COLUMN project_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_project_member_project_user
    ON project_members (project_id, user_id);

ALTER TABLE tasks ADD CONSTRAINT uk_tasks_id_project UNIQUE (id, project_id);
ALTER TABLE task_labels ADD CONSTRAINT uk_task_labels_id_project UNIQUE (id, project_id);

ALTER TABLE task_assignees
    ADD CONSTRAINT fk_task_assignees_task_project
    FOREIGN KEY (task_id, project_id) REFERENCES tasks (id, project_id) ON DELETE CASCADE;

ALTER TABLE task_assignees
    ADD CONSTRAINT fk_task_assignees_project_member
    FOREIGN KEY (project_id, user_id) REFERENCES project_members (project_id, user_id) ON DELETE CASCADE;

ALTER TABLE task_label_mappings
    ADD CONSTRAINT fk_task_label_mappings_task_project
    FOREIGN KEY (task_id, project_id) REFERENCES tasks (id, project_id) ON DELETE CASCADE;

ALTER TABLE task_label_mappings
    ADD CONSTRAINT fk_task_label_mappings_label_project
    FOREIGN KEY (label_id, project_id) REFERENCES task_labels (id, project_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_task_assignees_project_user
    ON task_assignees (project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_task_label_mappings_project
    ON task_label_mappings (project_id);
