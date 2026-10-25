ALTER TABLE conversation_ai_requests ADD COLUMN question_hash text;
ALTER TABLE conversation_ai_requests ADD COLUMN dispatch_after timestamptz NOT NULL DEFAULT now();
ALTER TABLE conversation_ai_requests ADD COLUMN dispatch_attempts int NOT NULL DEFAULT 0;
CREATE INDEX conversation_ai_dispatch_due ON conversation_ai_requests(status,dispatch_after,created_at);
