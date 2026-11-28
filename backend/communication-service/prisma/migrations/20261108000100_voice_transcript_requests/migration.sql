CREATE TABLE voice_transcript_requests (
  media_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  chat_type text NOT NULL CHECK (chat_type IN ('CHANNEL','DIRECT_MESSAGE')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DISPATCHED','FAILED','CANCELLED')),
  lease_token uuid,
  lease_until timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (media_id,chat_type)
);
CREATE INDEX voice_transcript_requests_pending ON voice_transcript_requests(status,next_attempt_at);
