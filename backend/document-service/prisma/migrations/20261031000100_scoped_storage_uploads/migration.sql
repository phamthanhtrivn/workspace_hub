CREATE TABLE "storage_upload_intents" (
    "s3_key" TEXT NOT NULL,
    "actor_id" UUID NOT NULL,
    "public_document_id" UUID,
    "size_bytes" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "target" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "storage_upload_intents_pkey" PRIMARY KEY ("s3_key")
);
CREATE INDEX "storage_upload_intents_expires_at_idx" ON "storage_upload_intents"("expires_at");
