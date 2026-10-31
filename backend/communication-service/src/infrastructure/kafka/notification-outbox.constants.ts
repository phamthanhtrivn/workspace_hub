export const NOTIFICATION_OUTBOX = {
  pollIntervalMs: 2_000,
  batchSize: 50,
  sendTimeoutMs: 5_000,
  leaseSeconds: 30,
  maxBackoffSeconds: 60,
  pending: 'PENDING',
  published: 'PUBLISHED',
} as const;
