# Calendar Notification Outbox

## Goal
Persist calendar invitations and attendee responses atomically, then deliver them to the shared notification Kafka topic with retries.

## Tasks
- [x] Add the notification outbox schema and migration with a pending-work index.
- [x] Enqueue invitation and response events inside calendar database transactions.
- [x] Add an outbox worker with claiming, retry, and terminal failure handling.
- [x] Keep the existing notification payload, links, and frontend category unchanged.
- [x] Add focused outbox and transaction tests.
- [x] Run Prisma validation, unit/e2e tests, lint, type-check, and builds.

## Done When
- [x] Calendar writes and notification outbox writes commit or roll back together.
- [x] Kafka failures remain retryable without failing calendar API calls.
- [x] Existing reminder dispatch remains unchanged.
