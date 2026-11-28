ALTER TABLE document_items ADD COLUMN import_key TEXT;
CREATE UNIQUE INDEX document_items_import_key_key ON document_items(import_key);
CREATE TABLE storage_cleanup_jobs (
  id UUID PRIMARY KEY,
  s3_key TEXT NOT NULL UNIQUE,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX storage_cleanup_jobs_next_attempt_at_idx ON storage_cleanup_jobs(next_attempt_at);

ALTER TABLE document_items ADD COLUMN access_sync_revision BIGINT NOT NULL DEFAULT 0;
