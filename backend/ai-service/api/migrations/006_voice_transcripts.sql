CREATE TABLE IF NOT EXISTS notebook_ai.voice_transcripts (
  actor_id uuid NOT NULL,
  media_id uuid NOT NULL,
  chat_type text NOT NULL CHECK (chat_type IN ('CHANNEL','DIRECT_MESSAGE')),
  revision text NOT NULL,
  run_id uuid NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED')),
  chunks jsonb NOT NULL DEFAULT '[]'::jsonb,
  text text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, media_id, chat_type)
);
CREATE INDEX IF NOT EXISTS voice_transcript_recovery ON notebook_ai.voice_transcripts(status, updated_at);
