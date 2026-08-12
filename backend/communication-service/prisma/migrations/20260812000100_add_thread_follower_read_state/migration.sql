ALTER TABLE "thread_followers" ADD COLUMN "last_read_at" TIMESTAMP(3);

ALTER TABLE "direct_thread_followers" ADD COLUMN "last_read_at" TIMESTAMP(3);
