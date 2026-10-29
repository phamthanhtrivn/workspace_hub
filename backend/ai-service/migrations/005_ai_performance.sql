BEGIN;
SELECT pg_advisory_xact_lock(8087001);
CREATE INDEX IF NOT EXISTS work_assistant_first_question
 ON notebook_ai.work_assistant_messages(session_id,created_at,id) WHERE role='user';
COMMIT;
