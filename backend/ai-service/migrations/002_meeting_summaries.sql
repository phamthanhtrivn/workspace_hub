CREATE TABLE IF NOT EXISTS notebook_ai.meeting_summaries (
  recording_id uuid PRIMARY KEY,
  run_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  revision text NOT NULL,
  status text NOT NULL CHECK(status IN ('QUEUED','RUNNING','COMPLETED','FAILED')),
  stage text NOT NULL DEFAULT 'QUEUED',
  transcript jsonb NOT NULL DEFAULT '[]',
  partials jsonb NOT NULL DEFAULT '[]',
  content text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meeting_summary_recovery
  ON notebook_ai.meeting_summaries(status,updated_at);
