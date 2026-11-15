# Local development on the host

Run commands from the repository root unless an application directory is stated. Web and the six business applications run in separate host terminals. Infrastructure, gateway, LiveKit/Egress and all AI processes run together in Docker.

## Infrastructure and environment

Use Docker Desktop with Compose include support (2.20+), Node 22, Java 21 and Maven. Docker components load their own private env under backend/docker/{infra,gateway,realtime,ai}. Host applications keep their existing service env; User Service needs JVM/IDE environment injection.

~~~powershell
node backend/scripts/prepare-local-docker-env.mjs
node backend/scripts/validate-local-docker-env.mjs
docker compose -f backend/docker/compose.yml config --quiet
docker compose -f backend/docker/compose.yml up -d --build
~~~

Preparation defaults to a dry run. Use --write to synchronize after review. Existing local files have already been moved; see [Docker migration](../../backend/docker/README.md#transition-from-the-previous-ai-stack) before replacing old AI containers. The combined project preserves infrastructure/recording and AI data volumes. Initializer/migration containers normally exit 0.

Applications use published localhost PostgreSQL/Redis/Kafka ports. Container callers use Docker DNS for shared infrastructure and host.docker.internal for business applications. Kong's host template forwards business requests to the host and AI requests to notebook-api. The host services must bind to an interface reachable from Docker and have the required local firewall access.

### Authentication and service credentials

Use [environment configuration](environment.md) for the source-backed reader inventory, caller keys and Docker/host checks. JWT verifier settings must match User/Kong. Each internal caller/receiver direction has a dedicated key. AI_GATEWAY_KEY matches AI and Kong; Document/RAG/speech and Work Assistant integrations use their dedicated credentials. No provider/internal key belongs in frontend public variables.

~~~powershell
node backend/scripts/prepare-local-security-env.mjs
node backend/scripts/validate-local-env.mjs
node backend/scripts/validate-local-docker-env.mjs
~~~

Security preparation is also a dry run unless --write is supplied. After an intentional key change, synchronize Docker and recreate only affected containers/processes. It does not rotate working credentials automatically.

## Schema preparation

Run schema changes explicitly after reviewing the target database. This local
setup uses the shared `postgres` credential for both application connections
and migrations; it does not isolate database privileges between services.

| Owner | Schema mechanism |
| --- | --- |
| User | SQL under `backend/user-service/src/main/resources/db/migration` |
| Project | SQL under `backend/project-service/database/migrations` |
| Communication, Document, Calendar, Notification | Committed Prisma migrations in each service |

User/Project deployment SQL jobs use `deploy/shared/sql-migrations` with recorded
checksums. For local existing databases, follow the service's SQL migration order
with your PostgreSQL client; do not substitute Prisma migration for Project SQL.
User Service uses Hibernate `ddl-auto: validate` locally and in production. Run
reviewed migrations before starting it; Hibernate no longer fills schema gaps.
For an existing database created with Hibernate update, use the explicit
[User schema reconciliation procedure](../deployment/migrations.md#user-service-legacy-schema)
after a backup. Production continues to use its migration job.
For Prisma services, use `npx prisma generate`, then explicitly apply reviewed
committed migrations using `npx prisma migrate deploy`. Existing Communication
databases may need the baseline preparation described in
[migration guide](../deployment/migrations.md); do not reset to resolve drift.

### Fresh local WorkspaceHub state

Stop all host applications (including web, IDE DB consoles and any host AI worker) with Ctrl+C. Keep PostgreSQL, Redis, Kafka, Qdrant and the Docker RAG worker running. Stop Docker AI consumers and realtime recording before inspecting the reset:

In DBeaver, disconnect the database connections, including metadata sessions; closing SQL editor tabs is not enough. The reset reports ACTIVE_DATABASE_CONNECTIONS with database names and connection counts and stops before deletion if any connection remains.

~~~powershell
docker compose -f backend/docker/compose.yml up -d postgres redis kafka notebook-qdrant rag-worker
docker compose -f backend/docker/compose.yml stop notebook-api notebook-jobs livekit-egress livekit
node backend/scripts/reset-local-workspace.mjs
~~~

The command above is read-only. Apply the reported scope only when ready to remove all WorkspaceHub local application rows:

~~~powershell
node backend/scripts/reset-local-workspace.mjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Reset failed. Resolve the reported error before starting services.' }
node backend/scripts/validate-local-env.mjs
~~~

The reset backs up and restore-tests the seven configured databases, then truncates application tables and restarts their identity sequences. It preserves schemas, Prisma/Flyway/AI and local security migration histories, grants and the existing credential mode. Pending migrations are still applied explicitly using each service's normal migration command. Backups are kept under ignored .tmp/security-fresh-backups; a table-clear failure triggers restoration of all seven backups.

It also recreates the six WorkspaceHub Kafka topics/consumer groups, clears known WorkspaceHub Redis prefixes (including AI queues), and removes the Notebook Qdrant indexes and source manifests through the current Docker RAG container. No helper container is started by the reset script. Stop applications before running it and do not reconnect until it finishes. Queue/index cleanup failures can happen after database data has been cleared; preserve the printed backup location and inspect the failed phase before retrying.

Other databases, Docker volumes, downloaded models, private env files, S3 files and backups are retained. Accounts are removed, so clear browser site data or sign out and register new test accounts afterward. Restart the RAG worker to discard its in-memory caches, start notification consumers before business producers, and start AI API/jobs only after migrations.

## Applications: separate terminals

| Application directory | Start command | Default port |
| --- | --- | --- |
| `backend/user-service` | `mvn spring-boot:run` or IDE | 8081 |
| `backend/project-service` | `npm run start:dev` | 8082 |
| `backend/communication-service` | `npm run start:dev` | 8083 |
| `backend/notification-service` | `npm run start:dev` | 8084 |
| `backend/document-service` | `npm run start:dev` | 8085 |
| `backend/calendar-service` | `npm run start:dev` | 8086 |
| `frontend/web` | `npm run dev` | 3000 |

Run `npm ci` in each Node application first and generate its Prisma client where
applicable. User Service does not automatically load `.env`: supply the existing
variables through your IDE run configuration or terminal environment before Maven.
AI API/jobs and Python workers run in Docker; see [AI setup](../../backend/ai-service/README.md). Do not start another host AI API/jobs instance against the same ports/queues.

AI shares `wh_postgres` (PostgreSQL 15) and `wh_redis`: dedicated database
`notebook_db`, shared local PostgreSQL login `postgres`, and prefix `wh-notebook`.
The local Redis DB index comes from the existing AI `REDIS_URL` (currently 0).
Host Node uses published ports. AI and the other six services currently use
the same local PostgreSQL credential from `backend/docker/infra/.env`.
The shared Redis uses AOF/everysec/noeviction; enable AOF online and wait for its
rewrite before recreating a pre-existing Redis that has only RDB persistence.

Check each service's readiness directly, then through Kong at
`http://localhost:8000/health/<service>` (for example `/health/document`). Open
`http://localhost:3000`, authenticate, and verify chat/meeting WebSocket connections
and inter-service calls. A healthy gateway alone does not prove the apps are up.
Services called by Docker infrastructure must listen on an interface reachable
through `host.docker.internal`; allow the required local firewall access.

## Recording, CI and production

Egress and speech start by default with the combined Compose project. Keep existing recording volumes. The webhook targets host Communication
at `http://host.docker.internal:8083/api/meetings/livekit/webhook`.
See [LiveKit and recording](../../backend/livekit/README.md).

Use the available build, typecheck, lint, and focused regression test commands
after changes. Production builds/pushes SHA images in
GitHub Actions; EC2 pulls them, runs migration containers, checks health and rolls
back failures. See [deployment](../deployment/production.md).
