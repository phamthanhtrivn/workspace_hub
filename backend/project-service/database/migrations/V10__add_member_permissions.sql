ALTER TABLE project_members
    ADD COLUMN can_create_task BOOLEAN,
    ADD COLUMN can_edit_own_task BOOLEAN,
    ADD COLUMN can_edit_others_task BOOLEAN,
    ADD COLUMN can_manage_sprints BOOLEAN,
    ADD COLUMN can_manage_members BOOLEAN,
    ADD COLUMN can_manage_labels BOOLEAN;

UPDATE project_members member
SET can_create_task = CASE
        WHEN member.role IN ('OWNER', 'ADMIN') THEN TRUE
        ELSE COALESCE((
            SELECT setting.allow_member_create_task
            FROM project_settings setting
            WHERE setting.project_id = member.project_id
        ), FALSE)
    END,
    can_edit_own_task = CASE
        WHEN member.role IN ('OWNER', 'ADMIN') THEN TRUE
        ELSE COALESCE((
            SELECT setting.allow_member_edit_own_task
            FROM project_settings setting
            WHERE setting.project_id = member.project_id
        ), FALSE)
    END,
    can_edit_others_task = CASE
        WHEN member.role IN ('OWNER', 'ADMIN') THEN TRUE
        ELSE COALESCE((
            SELECT setting.allow_member_edit_others_task
            FROM project_settings setting
            WHERE setting.project_id = member.project_id
        ), FALSE)
    END,
    can_manage_sprints = member.role IN ('OWNER', 'ADMIN'),
    can_manage_members = CASE
        WHEN member.role IN ('OWNER', 'ADMIN') THEN TRUE
        ELSE COALESCE((
            SELECT setting.allow_member_invite
            FROM project_settings setting
            WHERE setting.project_id = member.project_id
        ), FALSE)
    END,
    can_manage_labels = member.role IN ('OWNER', 'ADMIN');

ALTER TABLE project_members
    ALTER COLUMN can_create_task SET DEFAULT FALSE,
    ALTER COLUMN can_create_task SET NOT NULL,
    ALTER COLUMN can_edit_own_task SET DEFAULT FALSE,
    ALTER COLUMN can_edit_own_task SET NOT NULL,
    ALTER COLUMN can_edit_others_task SET DEFAULT FALSE,
    ALTER COLUMN can_edit_others_task SET NOT NULL,
    ALTER COLUMN can_manage_sprints SET DEFAULT FALSE,
    ALTER COLUMN can_manage_sprints SET NOT NULL,
    ALTER COLUMN can_manage_members SET DEFAULT FALSE,
    ALTER COLUMN can_manage_members SET NOT NULL,
    ALTER COLUMN can_manage_labels SET DEFAULT FALSE,
    ALTER COLUMN can_manage_labels SET NOT NULL;

UPDATE project_members
SET role = 'MEMBER'
WHERE role = 'ADMIN';

ALTER TABLE project_members DROP CONSTRAINT IF EXISTS chk_project_members_role;
ALTER TABLE project_members
    ADD CONSTRAINT chk_project_members_role CHECK (role IN ('OWNER', 'MEMBER'));
