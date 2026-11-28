BEGIN;
SELECT pg_advisory_xact_lock(8087001);
ALTER TABLE notebook_ai.work_assistant_sessions
 ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE notebook_ai.work_assistant_sessions s
 SET updated_at=m.latest
 FROM (SELECT session_id,max(created_at) latest FROM notebook_ai.work_assistant_messages GROUP BY session_id) m
 WHERE s.id=m.session_id AND s.updated_at<m.latest;
CREATE INDEX IF NOT EXISTS work_assistant_session_list
 ON notebook_ai.work_assistant_sessions(owner_id,project_id,updated_at DESC,id DESC);
COMMIT;
