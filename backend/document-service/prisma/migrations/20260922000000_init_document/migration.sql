-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('FILE', 'FOLDER');

-- CreateEnum
CREATE TYPE "SharePermission" AS ENUM ('VIEWER', 'EDITOR');

-- CreateEnum
CREATE TYPE "LinkAccess" AS ENUM ('NONE', 'VIEWER', 'EDITOR');

-- CreateTable
CREATE TABLE "user_storage_quotas" (
    "user_id" UUID NOT NULL,
    "max_bytes" BIGINT NOT NULL DEFAULT 5368709120,
    "used_bytes" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_storage_quotas_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "document_items" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "owner_email" TEXT NOT NULL,
    "parent_folder_id" UUID,
    "project_id" UUID,
    "name" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "s3_key" TEXT,
    "mime_type" TEXT,
    "size_bytes" BIGINT NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "link_access" "LinkAccess" NOT NULL DEFAULT 'NONE',
    "share_token" TEXT,
    "share_password" TEXT,
    "share_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_shares" (
    "id" UUID NOT NULL,
    "document_item_id" UUID NOT NULL,
    "share_with_user_id" UUID,
    "share_with_email" TEXT NOT NULL,
    "permission" "SharePermission" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "document_item_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "s3_key" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_starred_documents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_item_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_starred_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile_snapshots" (
    "user_id" UUID NOT NULL,
    "email" TEXT,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profile_snapshots_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_items_share_token_key" ON "document_items"("share_token");

-- CreateIndex
CREATE INDEX "document_items_owner_user_id_is_archived_idx" ON "document_items"("owner_user_id", "is_archived");

-- CreateIndex
CREATE INDEX "document_items_parent_folder_id_idx" ON "document_items"("parent_folder_id");

-- CreateIndex
CREATE INDEX "document_items_is_archived_archived_at_idx" ON "document_items"("is_archived", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "document_shares_document_item_id_share_with_email_key" ON "document_shares"("document_item_id", "share_with_email");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_document_item_id_version_number_key" ON "document_versions"("document_item_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "user_starred_documents_user_id_document_item_id_key" ON "user_starred_documents"("user_id", "document_item_id");

-- AddForeignKey
ALTER TABLE "document_items" ADD CONSTRAINT "document_items_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "document_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_document_item_id_fkey" FOREIGN KEY ("document_item_id") REFERENCES "document_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_item_id_fkey" FOREIGN KEY ("document_item_id") REFERENCES "document_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_starred_documents" ADD CONSTRAINT "user_starred_documents_document_item_id_fkey" FOREIGN KEY ("document_item_id") REFERENCES "document_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

