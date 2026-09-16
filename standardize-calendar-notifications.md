# Standardize Calendar Notifications

## Goal
Publish calendar invitations and attendee responses through the shared notification Kafka topic without changing user-visible behavior.

## Tasks
- [x] Reuse one calendar Kafka producer across event notifications and reminders.
- [x] Publish the existing calendar notification payload to `notification-topic`.
- [x] Allow notification-service to consume calendar messages from the shared topic.
- [x] Add a focused producer test and runtime consumer verification.
- [x] Run tests and builds for both affected services.

## Done When
- [x] Calendar invitations and responses reach the existing notification creation flow through Kafka.
- [x] Reminder delivery behavior remains unchanged.
- [x] Both affected services compile and focused tests pass.

## Notes
The existing `CALENDAR_REMINDER` type is retained to preserve filtering and frontend behavior.
