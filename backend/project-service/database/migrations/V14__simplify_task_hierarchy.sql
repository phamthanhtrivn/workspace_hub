UPDATE tasks
SET task_type = 'TASK'
WHERE task_type = 'SUBTASK';

ALTER TABLE tasks
DROP CONSTRAINT chk_tasks_task_type;

ALTER TABLE tasks
ADD CONSTRAINT chk_tasks_task_type
CHECK (task_type IN ('TASK', 'BUG', 'STORY', 'EPIC'));

ALTER TABLE tasks
DROP COLUMN is_parent_task;
