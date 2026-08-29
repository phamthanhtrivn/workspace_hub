# Calendar Service

NestJS + Prisma service for WorkspaceHub calendars, events, attendees, recurring occurrences, reminders, and task projections.

## Capabilities

- Stores recurring events as queryable occurrences and supports `THIS`, `THIS_AND_FOLLOWING`, and `ALL` update/cancel scopes.
- Dispatches due reminders to `calendar-reminder-events`; Notification Service delivers `ALERT`, `PUSH`, or `EMAIL`.
- Enforces private/public visibility and returns per-user event permissions.
- Verifies project and document access through their owning services.
- Consumes `project-task-events` and creates read-only calendar projections for project members.
- Validates date/UUID filters and paginates event range queries.

## Local configuration

Copy `.env.example` to `.env` when running the service outside Docker. Apply schema changes with migrations:

```sh
npm ci
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

The shared Docker Compose stack does not publish port `8086` to the host; Calendar is reached through Kong. It uses `calendar_db`, which is created when the Postgres volume is initialized.

## Kafka topics

- consumes: `user-profile-events`, `project-task-events`
- produces: `calendar-reminder-events`
