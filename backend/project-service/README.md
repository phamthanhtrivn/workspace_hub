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

Container startup also does not mutate the database schema. Apply the SQL
migrations through the deployment/database workflow before starting a new
service version. In particular, never add `prisma db push --accept-data-loss`
to the startup command.

> Migration audit note: the repository currently contains two historical
> `V4` files. They are retained to avoid rewriting already-applied migration
> history. A deployment runner must use the file names/order recorded by that
> environment until these migrations are baselined in a migration history
> table.

## Checks

```bash
npm run prisma:validate
npm run lint
npm run build
```

This NestJS service is the active Project Service. Apply the SQL migrations in
order before starting the service in a new environment.
