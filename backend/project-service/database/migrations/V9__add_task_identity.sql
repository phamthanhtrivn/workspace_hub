ALTER TABLE projects
    ADD COLUMN next_task_number INTEGER NOT NULL DEFAULT 1;

ALTER TABLE tasks
    ADD COLUMN task_number INTEGER,
    ADD COLUMN task_type VARCHAR(20) NOT NULL DEFAULT 'TASK';

WITH numbered_tasks AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at, id)::INTEGER AS task_number
    FROM tasks
)
UPDATE tasks
SET task_number = numbered_tasks.task_number
FROM numbered_tasks
WHERE tasks.id = numbered_tasks.id;

UPDATE tasks
SET task_type = CASE
    WHEN parent_task_id IS NOT NULL THEN 'SUBTASK'
    WHEN is_parent_task THEN 'EPIC'
    ELSE 'TASK'
END;

UPDATE projects project
SET next_task_number = COALESCE((
    SELECT MAX(task.task_number) + 1
    FROM tasks task
    WHERE task.project_id = project.id
), 1);

ALTER TABLE tasks
    ALTER COLUMN task_number SET NOT NULL;

ALTER TABLE tasks
    ADD CONSTRAINT chk_tasks_task_type
        CHECK (task_type IN ('TASK', 'BUG', 'STORY', 'EPIC', 'SUBTASK'));

CREATE UNIQUE INDEX uk_tasks_project_task_number
    ON tasks(project_id, task_number);
