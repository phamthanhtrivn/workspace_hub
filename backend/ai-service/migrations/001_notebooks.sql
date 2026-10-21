BEGIN;
SELECT pg_advisory_xact_lock(8087001);
CREATE SCHEMA IF NOT EXISTS notebook_ai;
CREATE TABLE IF NOT EXISTS notebook_ai.notebooks (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL, title varchar(200) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notebook_owner ON notebook_ai.notebooks(owner_id);
CREATE TABLE IF NOT EXISTS notebook_ai.sources (
 id uuid PRIMARY KEY, notebook_id uuid NOT NULL REFERENCES notebook_ai.notebooks(id) ON DELETE CASCADE,
 document_id uuid NOT NULL, version_id uuid NOT NULL, revision text NOT NULL, name text NOT NULL,
 size_bytes bigint NOT NULL, status text NOT NULL DEFAULT 'QUEUED', progress int NOT NULL DEFAULT 0,
 chunk_count int NOT NULL DEFAULT 0, error text, owner_email text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(notebook_id, document_id, version_id)
);
CREATE TABLE IF NOT EXISTS notebook_ai.messages (
 id uuid PRIMARY KEY, notebook_id uuid NOT NULL REFERENCES notebook_ai.notebooks(id) ON DELETE CASCADE,
 role text NOT NULL, content text NOT NULL, citations jsonb NOT NULL DEFAULT '[]',
 sources jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notebook_messages ON notebook_ai.messages(notebook_id, created_at);
CREATE TABLE IF NOT EXISTS notebook_ai.notes (
 id uuid PRIMARY KEY, notebook_id uuid NOT NULL REFERENCES notebook_ai.notebooks(id) ON DELETE CASCADE,
 title varchar(200) NOT NULL, content text NOT NULL, citations jsonb NOT NULL DEFAULT '[]',
 sources jsonb NOT NULL DEFAULT '[]', kind text NOT NULL DEFAULT 'MANUAL',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notebook_ai.requests (
 id uuid PRIMARY KEY, notebook_id uuid NOT NULL REFERENCES notebook_ai.notebooks(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL, status text NOT NULL DEFAULT 'RUNNING',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_answer ON notebook_ai.requests(notebook_id) WHERE status='RUNNING';
CREATE INDEX IF NOT EXISTS notebook_request_owner ON notebook_ai.requests(owner_id,created_at);
CREATE TABLE IF NOT EXISTS notebook_ai.artifacts (
 id uuid PRIMARY KEY, notebook_id uuid NOT NULL REFERENCES notebook_ai.notebooks(id) ON DELETE CASCADE,
 kind text NOT NULL, cache_key text NOT NULL, sources jsonb NOT NULL,
 status text NOT NULL DEFAULT 'QUEUED', progress int NOT NULL DEFAULT 0,
 content text NOT NULL DEFAULT '', citations jsonb NOT NULL DEFAULT '[]', sections jsonb NOT NULL DEFAULT '[]',
 error text, owner_email text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(notebook_id,cache_key)
);
CREATE TABLE IF NOT EXISTS notebook_ai.model_calls (
 id uuid PRIMARY KEY, model text NOT NULL, input_tokens int NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notebook_ai.artifacts ADD COLUMN IF NOT EXISTS in_flight boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS notebook_model_usage ON notebook_ai.model_calls(model,created_at);
COMMIT;
