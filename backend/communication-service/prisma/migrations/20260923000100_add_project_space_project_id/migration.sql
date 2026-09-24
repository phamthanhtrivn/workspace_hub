ALTER TABLE "spaces" ADD COLUMN "project_id" UUID;

CREATE UNIQUE INDEX "spaces_project_id_key" ON "spaces"("project_id");
