CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    predecessor_task_id UUID NOT NULL,
    successor_task_id UUID NOT NULL,
    dependency_type VARCHAR(30) NOT NULL DEFAULT 'FINISH_TO_START',
    created_by UUID NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT chk_task_dependency_not_self CHECK (predecessor_task_id <> successor_task_id),
    CONSTRAINT uk_task_dependency_project_predecessor_successor UNIQUE (project_id, predecessor_task_id, successor_task_id),
    CONSTRAINT fk_task_dependencies_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_dependencies_predecessor_project FOREIGN KEY (predecessor_task_id, project_id) REFERENCES tasks(id, project_id) ON DELETE CASCADE,
    CONSTRAINT fk_task_dependencies_successor_project FOREIGN KEY (successor_task_id, project_id) REFERENCES tasks(id, project_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_successor ON task_dependencies (project_id, successor_task_id);
