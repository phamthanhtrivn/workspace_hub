# Project Service (NestJS)

NestJS replacement for the legacy Spring Boot project service. It keeps the
existing HTTP contract and runs on port `8082`, so Kong and the current web
frontend do not need route changes.

## Run locally

```bash
copy .env.example .env
npm install
npm run prisma:generate
npm run start:dev
```

`JWT_SECRET_KEY` must be the same HS256 secret used by User Service and Kong.
For the standalone container stack, set this variable and run:

```bash
docker compose up --build
```

The full Workspace Hub stack includes `docker-compose.stack.yml`, which does
not publish port `8082`; Project Service is reachable through Kong only.

The database schema is managed by the SQL migrations under
`database/migrations`. Prisma is used as the typed query client only; do not
run `prisma migrate` against this database.

Container startup also does not mutate the database schema. Apply the SQL
migrations through the deployment/database workflow before starting a new
service version. In particular, never add `prisma db push --accept-data-loss`
to the startup command.

Project and invitation notifications use the `notification_outbox` table.
Application writes and outbox inserts commit together. The in-process relay
publishes `project-notification-events` with the outbox ID as `eventId`, waits
for Kafka acknowledgement, and then marks the record `SENT`. Transient delivery
errors retry indefinitely with exponential backoff capped at one hour. Invalid
local payloads move to `DEAD` for operations review. Calendar snapshots use the
same relay and load the current task state before publishing. Kafka availability
does not determine whether a committed project request succeeds.

Migration versions are unique and must be applied in numeric order. The
renumbered history assumes a clean Project Service database.

## Checks

```bash
npm run prisma:validate
npm run lint
npm run build
```

This NestJS service is the active Project Service. Apply the SQL migrations in
order before starting the service in a new environment.

## Project production fixes (September 2026)

The lockfile includes patched `fast-uri` and `qs`. A scoped override pins
`@prisma/config`'s `deepmerge-ts` to 8.0.0 while retaining Prisma 6.19.3.
This fixes [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx).
Prisma generation, schema validation, build and database integration checks
cover the configuration/client workflow with this override. Remove the override
when a supported Prisma update brings a patched dependency itself.

Apply V11 (normalize numeric task ranks) and V12 (`project_files`) after the
existing migration history, then regenerate Prisma Client and deploy backend
and frontend together. The migrations were verified on a disposable PostgreSQL
15 database; they have not been applied to the shared development or production
database. Check the applied migration history before running them.

Project attachments are stored durably as PostgreSQL `BYTEA`, with metadata
queries that exclude file contents. Limits are 10 MiB per file, 100 MiB and 500
files per project. This bounded storage is included in database backups. The
download route serves an attachment, and all file routes check Project access;
upload requires membership, while deletion requires the uploader or owner.
There is no external object-storage or virus-scanning integration in this change.

Task creation accepts `sprintId` and creates the task in a planned Sprint in
one transaction. Timed task dates must include a timezone offset or `Z`; null
start/due dates clear the field. Project task discussions use the persisted
comment API, refreshed every five seconds while open. Sprint metrics display
current recorded progress; historical burndown is not generated without history.

To run database and HTTP integration checks, use a disposable database with
all migrations applied and set `TEST_DATABASE_URL`, then run
`npm run test:integration`. The suite deletes test data; never point it at a
shared or production database. Unit tests use `npm test`.
