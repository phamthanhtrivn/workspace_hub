CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active_family
    ON refresh_tokens (user_id, family_id, expires_at) WHERE revoked = false;
