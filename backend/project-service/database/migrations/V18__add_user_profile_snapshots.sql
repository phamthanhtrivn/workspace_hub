CREATE TABLE IF NOT EXISTS user_profile_snapshots (
    user_id UUID PRIMARY KEY,
    email VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_snapshots_synced_at
    ON user_profile_snapshots (synced_at);
