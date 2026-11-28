CREATE INDEX conversation_ai_actor_created ON conversation_ai_requests(actor_id,created_at);
CREATE TABLE conversation_ai_outbox (
 request_id uuid PRIMARY KEY REFERENCES conversation_ai_requests(id) ON DELETE CASCADE,
 reply_id uuid NOT NULL, status text NOT NULL DEFAULT 'PENDING',
 lease_token uuid, lease_until timestamptz, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 attempts int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversation_ai_outbox_pending ON conversation_ai_outbox(status,next_attempt_at);
