CREATE TABLE "user_profile_snapshots" (
    "user_id" UUID NOT NULL,
    "email" TEXT,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profile_snapshots_pkey" PRIMARY KEY ("user_id")
);
