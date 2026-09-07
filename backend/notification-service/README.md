# Notification Service

Notification Service persists notifications in `notification_db`, emits realtime Socket.IO updates, and sends Web Push or SMTP messages.

## Project events

Project Service publishes a versioned envelope to `project-notification-events` through its transactional outbox. The envelope contains `eventId`, `eventType`, `schemaVersion`, `producer`, `aggregateId`, `occurredAt`, `deliveryAttempt`, and `payload`.

For database-backed effects, the consumer claims `eventId` in `processed_events` and applies the notification change in the same PostgreSQL transaction. A repeated event therefore does not create or update a notification twice. Invitation email checks and records the same inbox key, but SMTP cannot participate in the database transaction; a process failure after SMTP accepts the message and before the inbox write can still cause a duplicate email.

Transient failures are published to `project-notification-events-retry`. Retry consumption uses exponential delays based on `PROJECT_NOTIFICATION_RETRY_BASE_DELAY_MS`, capped at 30 seconds. After `PROJECT_NOTIFICATION_MAX_RETRIES` retries, or immediately for an invalid event contract, the event is published to `project-notification-events-dlt` with failure details. If publishing to the retry or DLT topic fails, the source handler fails so Kafka can redeliver the original message.

Apply Prisma migrations before deploying the service:

```bash
npx prisma migrate deploy
```

Useful checks:

```bash
npx prisma validate
npm run lint
npm run verify:project-events
npm run build
```
