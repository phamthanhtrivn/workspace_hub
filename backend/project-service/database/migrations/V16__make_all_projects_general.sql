UPDATE projects
SET project_type = 'GENERAL'
WHERE project_type <> 'GENERAL';

ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_project_type;

ALTER TABLE projects
ADD CONSTRAINT chk_projects_project_type
CHECK (project_type = 'GENERAL');
