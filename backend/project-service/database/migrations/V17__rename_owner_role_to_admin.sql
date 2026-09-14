ALTER TABLE project_members
    DROP CONSTRAINT IF EXISTS chk_project_members_role;

UPDATE project_members
SET role = 'ADMIN'
WHERE role = 'OWNER';

ALTER TABLE project_members
    ADD CONSTRAINT chk_project_members_role
    CHECK (role IN ('ADMIN', 'MEMBER'));
