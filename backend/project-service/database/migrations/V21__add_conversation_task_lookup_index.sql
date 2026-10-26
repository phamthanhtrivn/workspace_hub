-- Support the read-only cross-project lookup of a sender's assigned tasks.
-- Idempotent for installations which already received the V2 user index.
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees (user_id);
