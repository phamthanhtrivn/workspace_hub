CREATE TABLE project_access_sync_jobs (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  revision BIGINT NOT NULL DEFAULT 1,
  document_status TEXT NOT NULL DEFAULT 'PENDING', chat_status TEXT NOT NULL DEFAULT 'PENDING',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT, updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX project_access_sync_jobs_next_attempt_at_idx ON project_access_sync_jobs(next_attempt_at);
