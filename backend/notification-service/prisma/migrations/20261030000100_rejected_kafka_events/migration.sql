CREATE TABLE "rejected_kafka_events" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "partition" INTEGER NOT NULL,
    "offset" TEXT NOT NULL,
    "payload_digest" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rejected_kafka_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rejected_kafka_events_topic_partition_offset_key"
    ON "rejected_kafka_events"("topic", "partition", "offset");
