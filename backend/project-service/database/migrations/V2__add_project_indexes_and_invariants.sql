ALTER TABLE projects ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

UPDATE tasks SET is_parent_task = FALSE WHERE is_parent_task IS NULL;
UPDATE tasks SET auto_complete_sprint = FALSE WHERE auto_complete_sprint IS NULL;
UPDATE projects SET version = 0 WHERE version IS NULL;
UPDATE tasks SET version = 0 WHERE version IS NULL;
UPDATE task_comments SET version = 0 WHERE version IS NULL;
UPDATE project_settings SET allow_member_create_task = FALSE WHERE allow_member_create_task IS NULL;
UPDATE project_settings SET allow_member_edit_others_task = FALSE WHERE allow_member_edit_others_task IS NULL;
UPDATE project_settings SET allow_member_edit_own_task = FALSE WHERE allow_member_edit_own_task IS NULL;
UPDATE project_settings SET allow_member_invite = FALSE WHERE allow_member_invite IS NULL;

ALTER TABLE projects ALTER COLUMN version SET DEFAULT 0;
ALTER TABLE projects ALTER COLUMN version SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN version SET DEFAULT 0;
ALTER TABLE tasks ALTER COLUMN version SET NOT NULL;
ALTER TABLE task_comments ALTER COLUMN version SET DEFAULT 0;
ALTER TABLE task_comments ALTER COLUMN version SET NOT NULL;
ALTER TABLE project_settings ALTER COLUMN allow_member_create_task SET DEFAULT FALSE;
ALTER TABLE project_settings ALTER COLUMN allow_member_create_task SET NOT NULL;
ALTER TABLE project_settings ALTER COLUMN allow_member_edit_others_task SET DEFAULT FALSE;
ALTER TABLE project_settings ALTER COLUMN allow_member_edit_others_task SET NOT NULL;
ALTER TABLE project_settings ALTER COLUMN allow_member_edit_own_task SET DEFAULT FALSE;
ALTER TABLE project_settings ALTER COLUMN allow_member_edit_own_task SET NOT NULL;
ALTER TABLE project_settings ALTER COLUMN allow_member_invite SET DEFAULT FALSE;
ALTER TABLE project_settings ALTER COLUMN allow_member_invite SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN is_parent_task SET DEFAULT FALSE;
ALTER TABLE tasks ALTER COLUMN is_parent_task SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN auto_complete_sprint SET DEFAULT FALSE;
ALTER TABLE tasks ALTER COLUMN auto_complete_sprint SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_owner_archived ON projects (owner_id, archived);
CREATE INDEX IF NOT EXISTS idx_projects_status_archived ON projects (status, archived);
CREATE INDEX IF NOT EXISTS idx_project_members_project_joined ON project_members (project_id, joined_at);
CREATE INDEX IF NOT EXISTS idx_tasks_project_active_rank ON tasks (project_id, archived, rank, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_project_due ON tasks (project_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_checklists_task_rank ON task_checklists (task_id, rank, created_at);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees (user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_created ON task_comments (task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_activities_task_created ON task_activities (task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_labels_project ON task_labels (project_id);
CREATE INDEX IF NOT EXISTS idx_task_label_mappings_label ON task_label_mappings (label_id);
CREATE INDEX IF NOT EXISTS idx_time_trackings_task_user_started ON time_trackings (task_id, user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_started ON pomodoro_sessions (user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_project_invitations_recipient_status_created
    ON project_invitations (invited_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_status
    ON project_invitations (project_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uk_project_invitation_pending
    ON project_invitations (project_id, invited_user_id)
    WHERE status = 'PENDING';

CREATE UNIQUE INDEX IF NOT EXISTS uk_task_label_project_name_ci
    ON task_labels (project_id, lower(name));
