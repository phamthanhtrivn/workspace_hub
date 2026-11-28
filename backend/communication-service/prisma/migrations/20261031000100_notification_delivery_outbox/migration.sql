CREATE TABLE "notification_delivery_outbox" (
    "id" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "message_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_token" UUID,
    "lease_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),
    CONSTRAINT "notification_delivery_outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_delivery_outbox_pending_idx"
ON "notification_delivery_outbox"("status", "next_attempt_at");
