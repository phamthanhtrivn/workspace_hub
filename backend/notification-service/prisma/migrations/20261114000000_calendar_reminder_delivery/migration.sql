ALTER TABLE notifications ADD COLUMN push_claimed_at TIMESTAMP(3);
CREATE TYPE "ReminderEmailStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'UNKNOWN', 'SKIPPED');
CREATE TABLE reminder_email_deliveries (
  id TEXT NOT NULL PRIMARY KEY,
  group_key TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  status "ReminderEmailStatus" NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMP(3),
  sent_at TIMESTAMP(3),
  last_error TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX reminder_email_deliveries_group_key_recipient_id_key
  ON reminder_email_deliveries(group_key, recipient_id);
