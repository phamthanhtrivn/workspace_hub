UPDATE projects
SET visibility = 'MEMBERS_ONLY'
WHERE visibility = 'PUBLIC';

ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_projects_visibility;
ALTER TABLE projects
    ADD CONSTRAINT chk_projects_visibility
    CHECK (visibility IN ('PRIVATE', 'MEMBERS_ONLY'));
