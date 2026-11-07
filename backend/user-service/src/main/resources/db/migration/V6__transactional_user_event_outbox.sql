CREATE SEQUENCE user_event_revision;

CREATE TABLE user_event_outbox (
    id uuid PRIMARY KEY,
    aggregate_id uuid NOT NULL,
    revision bigint NOT NULL UNIQUE,
    topic varchar(100) NOT NULL,
    payload jsonb NOT NULL,
    attempt_count integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    lease_token uuid,
    lease_until timestamptz,
    delivered_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_outbox_pending ON user_event_outbox (next_attempt_at, revision) WHERE delivered_at IS NULL;
CREATE INDEX idx_user_outbox_aggregate ON user_event_outbox (aggregate_id, revision) WHERE delivered_at IS NULL;

CREATE TABLE user_event_replay_checkpoint (
    name varchar(100) PRIMARY KEY,
    last_user_id uuid,
    completed boolean NOT NULL DEFAULT false
);
INSERT INTO user_event_replay_checkpoint (name) VALUES ('profile-snapshot-v1');
