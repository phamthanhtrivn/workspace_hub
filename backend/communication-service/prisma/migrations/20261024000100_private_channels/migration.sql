CREATE TYPE "ChannelVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
ALTER TABLE "channels"
  ADD COLUMN "visibility" "ChannelVisibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "owner_id" UUID;
ALTER TABLE "channels" ADD CONSTRAINT "default_channels_public"
  CHECK (NOT "is_default" OR "visibility" = 'PUBLIC');
ALTER TABLE "channels" ADD CONSTRAINT "private_channels_have_owner"
  CHECK ("visibility" <> 'PRIVATE' OR "owner_id" IS NOT NULL);
