CREATE TABLE "project_task_snapshots" (
  "task_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "version" BIGINT NOT NULL,
  "payload" JSONB NOT NULL,
  CONSTRAINT "project_task_snapshots_pkey" PRIMARY KEY ("task_id")
);
