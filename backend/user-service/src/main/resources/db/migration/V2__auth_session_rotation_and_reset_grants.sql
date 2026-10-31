ALTER TABLE users ADD COLUMN email_verified boolean NOT NULL DEFAULT false;

-- A collision needs an explicit account-resolution decision; never silently merge identities.
DO $$
BEGIN
    IF EXISTS (SELECT lower(btrim(email)) FROM users GROUP BY lower(btrim(email)) HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Case-insensitive email collisions must be resolved before this migration';
    END IF;
END $$;
UPDATE users SET email = lower(btrim(email));
CREATE UNIQUE INDEX users_email_normalized_key ON users(lower(btrim(email)));

ALTER TABLE refresh_tokens ADD COLUMN family_id uuid;
ALTER TABLE refresh_tokens ADD COLUMN rotated_at timestamp(6);
UPDATE refresh_tokens SET family_id = id WHERE family_id IS NULL;
ALTER TABLE refresh_tokens ALTER COLUMN family_id SET NOT NULL;
CREATE INDEX refresh_tokens_family_id_idx ON refresh_tokens(family_id);
CREATE INDEX refresh_tokens_user_id_revoked_idx ON refresh_tokens(user_id, revoked);

CREATE TABLE password_reset_grants (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamp(6) NOT NULL,
    consumed_at timestamp(6)
);
CREATE INDEX password_reset_grants_expires_at_idx ON password_reset_grants(expires_at);
