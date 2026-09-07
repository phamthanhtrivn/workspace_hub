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
Application writes and outbox inserts commit together; the in-process worker
delivers events with exponential retry. Failed events stop retrying after
`OUTBOX_MAX_ATTEMPTS` and remain queryable for operations review.

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
