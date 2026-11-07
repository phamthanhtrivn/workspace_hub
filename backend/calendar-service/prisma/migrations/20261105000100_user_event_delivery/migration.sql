CREATE TABLE user_event_cursors (
  topic text NOT NULL,
  user_id uuid NOT NULL,
  revision bigint NOT NULL,
  occurred_at timestamptz NOT NULL,
  PRIMARY KEY (topic, user_id)
);
CREATE TABLE rejected_kafka_events (
  id uuid PRIMARY KEY,
  topic text NOT NULL,
  partition integer NOT NULL,
  "offset" text NOT NULL,
  payload_digest text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(topic, partition, "offset")
);
