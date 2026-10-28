BEGIN;
SELECT pg_advisory_xact_lock(8087001);
CREATE TABLE IF NOT EXISTS notebook_ai.work_assistant_sessions (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL, project_id uuid,
 scope_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,scope_key)
);
CREATE TABLE IF NOT EXISTS notebook_ai.work_assistant_requests (
 id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES notebook_ai.work_assistant_sessions(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL, status text NOT NULL DEFAULT 'RUNNING', cancel_requested boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS work_assistant_one_running ON notebook_ai.work_assistant_requests(owner_id) WHERE status='RUNNING';
CREATE INDEX IF NOT EXISTS work_assistant_request_usage ON notebook_ai.work_assistant_requests(owner_id,created_at);
CREATE TABLE IF NOT EXISTS notebook_ai.work_assistant_messages (
 id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES notebook_ai.work_assistant_sessions(id) ON DELETE CASCADE,
 request_id uuid NOT NULL REFERENCES notebook_ai.work_assistant_requests(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('user','assistant')), content text NOT NULL,
 context jsonb NOT NULL DEFAULT 'null',
 sources jsonb NOT NULL DEFAULT '[]', project_ids jsonb NOT NULL DEFAULT '[]',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(request_id,role)
);
ALTER TABLE notebook_ai.work_assistant_messages ADD COLUMN IF NOT EXISTS context jsonb NOT NULL DEFAULT 'null';
CREATE INDEX IF NOT EXISTS work_assistant_message_page ON notebook_ai.work_assistant_messages(session_id,created_at,id);
CREATE TABLE IF NOT EXISTS notebook_ai.work_assistant_preferences (
 owner_id uuid PRIMARY KEY, preferences jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
