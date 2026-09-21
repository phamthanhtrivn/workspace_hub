-- Remove Sprint and Project File tables
DROP TABLE IF EXISTS project_files CASCADE;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_sprint;
ALTER TABLE tasks DROP COLUMN IF EXISTS sprint_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS auto_complete_sprint;
DROP TABLE IF EXISTS sprints CASCADE;

-- Remove project_type and visibility columns
ALTER TABLE projects DROP COLUMN IF EXISTS project_type;
ALTER TABLE projects DROP COLUMN IF EXISTS visibility;

-- Remove can_manage_sprints from project_members
ALTER TABLE project_members DROP COLUMN IF EXISTS can_manage_sprints;
