-- Existing requests remain untouched; only new summary requests participate.
ALTER TABLE conversation_ai_requests
  ADD COLUMN summary_key text,
  ADD COLUMN summary_action_id uuid;
CREATE INDEX conversation_ai_summary_lookup
  ON conversation_ai_requests(summary_key, created_at DESC, id DESC)
  WHERE summary_key IS NOT NULL;
CREATE UNIQUE INDEX conversation_ai_summary_action ON conversation_ai_requests(summary_action_id);
