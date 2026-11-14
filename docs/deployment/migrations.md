# Database migrations and reconciliation

Back up and compare schema/history before changing an existing database baseline. Never use reset, volume removal or Prisma db push to repair migration drift. Released SQL checksums must remain unchanged.

| Owner | Migration source |
| --- | --- |
| User | backend/user-service/src/main/resources/db/migration |
| Project | backend/project-service/database/migrations |
| Communication, Document, Calendar, Notification | prisma/migrations in the owning service |
| AI | backend/ai-service/api/migrations |

User and Project use the checksum/locking SQL runner in deploy/shared/sql-migrations. Prisma owns migrations for the other business services. Project's Prisma schema is a query-client model, not a replacement for its SQL migration history. Local AI migration runs after the idempotent notebook database initializer and before API/jobs.

## Rollout

Apply all committed migrations required by the release, not just files mentioned in old notes. Migration failure must block rollout. A database created with Hibernate update, manual SQL or db push needs explicit baseline reconciliation; do not mark migrations applied without validating their effects.

Prepare service credentials before starting callers. Deploy receiver/storage changes before dependent services and web, then check readiness. Storage lifecycle, notification delivery/outboxes, project access synchronization, recording jobs/sharing and calendar conference/reminder changes all have migration dependencies. Calendar reminder delivery requires Notification migration/consumer first; existing notification history is not merged or replayed.

Task archive has been removed while task soft deletion remains; project/document archive is independent. Apply the release's task-archive-removal migration through the target environment's SQL mechanism. Do not copy a historical local migration-resolve operation into another environment without checking its history.

## User Service legacy schema

Hibernate uses ddl-auto: validate in local and production. A fresh database needs V1 onward before starting User Service. Do not apply V1 directly to a database with existing tables.

For legacy local user_db/public on PostgreSQL 15, inspect using Node 22+ and the existing PostgreSQL container:

~~~powershell
node --env-file=backend/user-service/.env backend/user-service/scripts/reconcile-auth-schema.mjs --check
~~~

The default is read-only. Exit codes are 0 (compatible), 1 (reconciliation needed), and 2 (unsupported structure, conflict or error). The default container is wh_postgres; --container overrides it. PGUSER or POSTGRES_USERNAME selects the role.

Before applying, stop User Service, create a pg_dump -Fc backup and restore-test it on a temporary database. Only for a reviewed compatible legacy baseline:

~~~powershell
node --env-file=backend/user-service/.env backend/user-service/scripts/reconcile-auth-schema.mjs --apply --adopt-baseline
node --env-file=backend/user-service/.env backend/user-service/scripts/reconcile-auth-schema.mjs --check
~~~

The tool uses the migration advisory lock and checks types, keys, constraints, indexes and identity conflicts. It repairs missing V2/V3 pieces, normalizes email, fills missing token family IDs from IDs, and keeps unverified email false. It does not change token hashes or merge accounts. V4 preserves the legacy allow_search_by_email default.

V1–V3 are recorded as a verified baseline only after postconditions pass; they are not claimed as SQL newly executed. V4 runs normally. Repair/history/checksum recording is transactional, and unsupported migrations or checksum conflicts are rejected. Retain the baseline report with the private backup. Do not run this adoption automatically at startup or in production.

User SQL migrations are LF-pinned for consistent Windows/CI checksums. After reconciliation, run the normal migration runner and start User with validation, then verify /ready.

## Other reconciliation tools

Run from the owning service directory. These report by default; --apply writes changes after review.

| Service | Report command | Apply behavior |
| --- | --- | --- |
| Document | node scripts/reconcile-storage.cjs --check-objects | Recalculate retained-version/trash usage while preserving files and quota limits |
| Project | node scripts/reconcile-access.cjs | Enqueue current membership snapshots for access synchronization |
| Calendar | node scripts/reconcile-conferences.cjs | Adopt verified legacy conference bindings and report ambiguous rooms |

Calendar requires a working Communication internal endpoint and matching key. One legacy room cannot be assigned to multiple occurrences; existing bindings and arbitrary location text are not overwritten.

On Windows, stop the process holding a Prisma DLL before generating that client again. Do not reset schema/data to work around a locked file. See [local setup](../development/local-setup.md) and [LiveKit](../../backend/livekit/README.md).
