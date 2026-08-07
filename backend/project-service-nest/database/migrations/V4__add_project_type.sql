ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(30);

UPDATE projects
SET project_type = 'GENERAL'
WHERE project_type IS NULL;

ALTER TABLE projects ALTER COLUMN project_type SET DEFAULT 'GENERAL';
ALTER TABLE projects ALTER COLUMN project_type SET NOT NULL;

ALTER TABLE projects ADD CONSTRAINT chk_projects_project_type
    CHECK (project_type IN ('GENERAL', 'SOFTWARE_DEVELOPMENT'));
