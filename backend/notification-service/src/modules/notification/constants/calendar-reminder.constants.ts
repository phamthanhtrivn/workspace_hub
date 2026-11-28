export const CALENDAR_REMINDER = {
  EVENT_TYPE: 'CALENDAR_REMINDER_DUE',
  TITLE: 'Calendar reminder',
  MAX_EMAIL_ATTEMPTS: 3,
  MAX_MINUTES_BEFORE: 30 * 24 * 60,
  EMAIL_LEASE_MS: 5 * 60_000,
  SMTP_CONNECTION_TIMEOUT_MS: 30_000,
  SMTP_SOCKET_TIMEOUT_MS: 60_000,
  UNKNOWN_EMAIL:
    'SMTP delivery outcome requires review; automatic resend disabled',
} as const;
