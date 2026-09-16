CREATE TABLE "notification_outbox" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_type" VARCHAR(50) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ(3),
  "locked_at" TIMESTAMPTZ(3),
  "last_error" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ(3),
  CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_outbox_status_check"
    CHECK ("status" IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
  CONSTRAINT "notification_outbox_attempt_count_check"
    CHECK ("attempt_count" >= 0)
);

CREATE INDEX "notification_outbox_pending_idx"
  ON "notification_outbox" ("status", "next_attempt_at", "created_at")
  WHERE "status" IN ('PENDING', 'FAILED', 'PROCESSING');
