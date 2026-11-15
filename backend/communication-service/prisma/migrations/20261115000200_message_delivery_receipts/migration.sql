-- No historical backfill. A receipt commits atomically with its message.
CREATE TABLE "message_delivery_receipts" (
    "sender_id" TEXT NOT NULL,
    "request_id" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_delivery_receipts_pkey" PRIMARY KEY ("sender_id", "request_id")
);
