-- AlterTable
ALTER TABLE "meeting_participants"
ADD COLUMN "last_read_message_id" UUID,
ADD COLUMN "last_read_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "meeting_messages"
ALTER COLUMN "content" DROP NOT NULL,
ADD COLUMN "type" "MessageType" NOT NULL DEFAULT 'TEXT',
ADD COLUMN "edited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "recalled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "meeting_medias" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "type" "MediaType" NOT NULL,

    CONSTRAINT "meeting_medias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_reactions" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" TEXT NOT NULL,

    CONSTRAINT "meeting_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meeting_messages_pinned_idx" ON "meeting_messages"("pinned");

-- CreateIndex
CREATE INDEX "meeting_medias_message_id_idx" ON "meeting_medias"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_reactions_message_id_user_id_emoji_key" ON "meeting_reactions"("message_id", "user_id", "emoji");

-- CreateIndex
CREATE INDEX "meeting_reactions_message_id_idx" ON "meeting_reactions"("message_id");

-- AddForeignKey
ALTER TABLE "meeting_medias" ADD CONSTRAINT "meeting_medias_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "meeting_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_reactions" ADD CONSTRAINT "meeting_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "meeting_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
