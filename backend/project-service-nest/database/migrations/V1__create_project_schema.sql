CREATE TABLE projects (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20),
    icon VARCHAR(10),
    owner_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_projects_status CHECK (status IN ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'))
);

CREATE TABLE project_settings (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL UNIQUE,
    allow_member_create_task BOOLEAN NOT NULL DEFAULT FALSE,
    allow_member_edit_others_task BOOLEAN NOT NULL DEFAULT FALSE,
    allow_member_edit_own_task BOOLEAN NOT NULL DEFAULT FALSE,
    allow_member_invite BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_project_settings_project FOREIGN KEY (project_id)
        REFERENCES projects (id) ON DELETE CASCADE
);

CREATE TABLE project_members (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    joined_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uk_project_member_project_user UNIQUE (project_id, user_id),
    CONSTRAINT chk_project_members_role CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
    CONSTRAINT fk_project_members_project FOREIGN KEY (project_id)
        REFERENCES projects (id) ON DELETE CASCADE
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    parent_task_id UUID,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_by UUID NOT NULL,
    reporter_id UUID NOT NULL,
    start_date TIMESTAMP(6),
    due_date TIMESTAMP(6),
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP(6),
    estimated_minutes INTEGER NOT NULL DEFAULT 0,
    rank VARCHAR(100),
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    is_parent_task BOOLEAN NOT NULL DEFAULT FALSE,
    auto_complete_sprint BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_tasks_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    CONSTRAINT chk_tasks_status CHECK (status IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE')),
    CONSTRAINT chk_tasks_estimated_minutes CHECK (estimated_minutes >= 0),
    CONSTRAINT chk_tasks_date_order CHECK (due_date IS NULL OR start_date IS NULL OR start_date <= due_date),
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id)
        REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_task_id)
        REFERENCES tasks (id) ON DELETE SET NULL
);

CREATE TABLE task_checklists (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_by UUID,
    created_at TIMESTAMP(6) NOT NULL,
    rank VARCHAR(100),
    CONSTRAINT fk_task_checklists_task FOREIGN KEY (task_id)
        REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE TABLE task_assignees (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    assigned_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uk_task_assignee_task_user UNIQUE (task_id, user_id),
    CONSTRAINT fk_task_assignees_task FOREIGN KEY (task_id)
        REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE TABLE task_comments (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    edited BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id)
        REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE TABLE task_activities (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    actor_id UUID,
    field VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_task_activities_task FOREIGN KEY (task_id)
        REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE TABLE task_labels (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    CONSTRAINT uk_task_label_project_name UNIQUE (project_id, name),
    CONSTRAINT fk_task_labels_project FOREIGN KEY (project_id)
        REFERENCES projects (id) ON DELETE CASCADE
);

CREATE TABLE task_label_mappings (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    label_id UUID NOT NULL,
    CONSTRAINT uk_task_label_mapping_task_label UNIQUE (task_id, label_id),
    CONSTRAINT fk_task_label_mappings_task FOREIGN KEY (task_id)
        REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_label_mappings_label FOREIGN KEY (label_id)
        REFERENCES task_labels (id) ON DELETE CASCADE
);

CREATE TABLE time_trackings (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    started_at TIMESTAMP(6) NOT NULL,
    ended_at TIMESTAMP(6),
    CONSTRAINT chk_time_trackings_date_order CHECK (ended_at IS NULL OR started_at <= ended_at),
    CONSTRAINT fk_time_trackings_task FOREIGN KEY (task_id)
        REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE TABLE pomodoro_configs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    focus_duration INTEGER NOT NULL,
    short_break INTEGER NOT NULL,
    long_break INTEGER NOT NULL,
    long_break_interval INTEGER NOT NULL,
    auto_start_break BOOLEAN NOT NULL DEFAULT FALSE,
    auto_start_focus BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_pomodoro_config_durations CHECK (
        focus_duration > 0 AND short_break >= 0 AND long_break >= 0 AND long_break_interval > 0
    )
);

CREATE TABLE pomodoro_sessions (
    id UUID PRIMARY KEY,
    task_id UUID,
    user_id UUID NOT NULL,
    session_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMP(6) NOT NULL,
    ended_at TIMESTAMP(6),
    CONSTRAINT chk_pomodoro_session_type CHECK (session_type IN ('FOCUS', 'SHORT_BREAK', 'LONG_BREAK')),
    CONSTRAINT chk_pomodoro_session_status CHECK (status IN ('COMPLETED', 'STOPPED', 'CANCELED')),
    CONSTRAINT chk_pomodoro_session_date_order CHECK (ended_at IS NULL OR started_at <= ended_at),
    CONSTRAINT fk_pomodoro_sessions_task FOREIGN KEY (task_id)
        REFERENCES tasks (id) ON DELETE SET NULL
);

CREATE TABLE project_invitations (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    invited_user_id UUID NOT NULL,
    invited_by UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP(6) NOT NULL,
    responded_at TIMESTAMP(6),
    expires_at TIMESTAMP(6),
    CONSTRAINT chk_project_invitations_status CHECK (
        status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED')
    ),
    CONSTRAINT fk_project_invitations_project FOREIGN KEY (project_id)
        REFERENCES projects (id) ON DELETE CASCADE
);
