CREATE TABLE "module_file_snapshots" (
  "id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "scope" TEXT NOT NULL,
  "notebook_id" UUID,
  "operation_key" TEXT NOT NULL,
  "source_document_id" UUID,
  "source_version_id" UUID,
  "revision" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" BIGINT NOT NULL,
  "s3_key" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PREPARING',
  "lease_token" UUID,
  "lease_until" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "module_file_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "module_file_snapshots_scope_check" CHECK ("scope" IN ('CHAT', 'NOTEBOOK')),
  CONSTRAINT "module_file_snapshots_status_check" CHECK ("status" IN ('PREPARING', 'UPLOADING', 'READY', 'FAILED')),
  CONSTRAINT "module_file_snapshots_size_check" CHECK ("size_bytes" >= 0)
);
CREATE UNIQUE INDEX "module_file_snapshots_operation_key_key" ON "module_file_snapshots"("operation_key");
CREATE INDEX "module_file_snapshots_actor_id_notebook_id_idx" ON "module_file_snapshots"("actor_id", "notebook_id");
CREATE INDEX "module_file_snapshots_expires_at_idx" ON "module_file_snapshots"("expires_at");
