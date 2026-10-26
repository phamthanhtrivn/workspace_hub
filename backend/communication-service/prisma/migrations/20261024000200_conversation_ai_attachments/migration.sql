ALTER TABLE conversation_ai_requests
  ADD COLUMN attachment_media_id uuid,
  ADD COLUMN attachment_hash text;
