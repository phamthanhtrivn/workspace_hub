ALTER TABLE "space_invitations"
  DROP COLUMN IF EXISTS "invited_by_name",
  DROP COLUMN IF EXISTS "invited_by_avatar",
  DROP COLUMN IF EXISTS "invited_user_name",
  DROP COLUMN IF EXISTS "invited_user_avatar";
