ALTER TABLE "direct_messages"
ADD COLUMN "thread_parent_id" UUID,
ADD COLUMN "thread_reply_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "thread_last_reply_at" TIMESTAMP(3);

ALTER TABLE "direct_messages"
ADD CONSTRAINT "direct_messages_thread_parent_id_fkey"
FOREIGN KEY ("thread_parent_id")
REFERENCES "direct_messages"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE TABLE "direct_thread_followers" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_thread_followers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "direct_thread_followers_message_id_user_id_key"
ON "direct_thread_followers"("message_id", "user_id");

ALTER TABLE "direct_thread_followers"
ADD CONSTRAINT "direct_thread_followers_message_id_fkey"
FOREIGN KEY ("message_id")
REFERENCES "direct_messages"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
