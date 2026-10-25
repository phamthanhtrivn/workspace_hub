CREATE TABLE conversation_ai_requests (
 id uuid PRIMARY KEY, actor_id uuid NOT NULL, chat_id uuid NOT NULL,
 chat_type text NOT NULL CHECK (chat_type IN ('CHANNEL','DIRECT_MESSAGE')),
 status text NOT NULL DEFAULT 'QUEUED', token uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversation_ai_pending ON conversation_ai_requests(status,created_at);
