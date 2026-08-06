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

The database schema is managed by the SQL migrations under
`database/migrations`. Prisma is used as the typed query client only; do not
run `prisma migrate` against this database.

## Checks

```bash
npm run prisma:validate
npm run lint
npm run build
```

This NestJS service is the active Project Service. Apply the SQL migrations in
order before starting the service in a new environment.
