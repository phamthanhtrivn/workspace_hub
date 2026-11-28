CREATE TABLE "document_attachment_imports" (
  "id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "operation_id" UUID NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "chat_id" UUID NOT NULL,
  "chat_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PREPARING',
  "result" JSONB,
  "lease_token" UUID,
  "lease_until" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "document_attachment_imports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "document_attachment_imports_actor_id_operation_id_key" ON "document_attachment_imports"("actor_id", "operation_id");
CREATE INDEX "document_attachment_imports_status_created_at_idx" ON "document_attachment_imports"("status", "created_at");
CREATE TABLE "media_copy_cleanup" (
  "s3_key" TEXT NOT NULL PRIMARY KEY,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
