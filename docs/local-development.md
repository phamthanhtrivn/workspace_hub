# Local development on the host

Run commands from the repository root unless a service directory is stated.
Docker runs infrastructure only. Applications use separate terminals on your
machine. CI and production continue to use application images.

## Infrastructure and environment

Use Docker Desktop with Compose v2, Node 22, Java 21/Maven.
Keep your existing private environment files:

- `backend/docker/.env`: PostgreSQL, Redis, Kafka ports and LiveKit settings.
- `backend/kong-gateway/.env`: gateway JWT secret and frontend origin.
- `backend/livekit/.env`: included LiveKit and recording settings.
- Each application: its own `.env`; frontend uses `frontend/web/.env` for host development and `.env.docker` for its Docker build.

```powershell
docker compose --env-file backend/docker/.env --env-file backend/livekit/.env -f backend/docker/docker-compose.host.yml config --quiet
docker compose --env-file backend/docker/.env --env-file backend/livekit/.env -f backend/docker/docker-compose.host.yml up -d --build
```

This preserves project `docker`, containers `wh_*`, network `wh_network`, and
existing PostgreSQL/Redis/recording volumes. Kafka init may exit successfully with
code 0. PostgreSQL initialization runs only for a new empty data directory; it
does not migrate an existing database. Never remove volumes as a setup step.

Kong uses `kong.host.yml` and `host.docker.internal`. To refresh only Kong:

```powershell
docker compose --env-file backend/docker/.env --env-file backend/livekit/.env -f backend/docker/docker-compose.host.yml up -d --build --no-deps kong
```

Applications connect to `localhost` and the published infrastructure ports in
your `.env` (for example PostgreSQL may use 5433 rather than 5432). Set Redis and
Kafka to the published host ports. Service URLs use `http://localhost:<port>`.
Use the same JWT signing secret in services that verify user tokens. Internal
service credentials are different for each caller/receiver direction. Do not use
container DNS names in host application configuration.

### Authentication and service credentials

Keep private env files and validate their names, placement and local database
roles with `node backend/scripts/validate-local-env.mjs`. The source-backed
inventory is `docs/local-env-contract.json`; no `.env.example` files are kept.

| Variable | Where it belongs |
| --- | --- |
| `JWT_SECRET_KEY`, `JWT_ISSUER` | User, Communication, Project, Calendar, Document and Notification verify access tokens. Set `JWT_SECRET_KEY` in each service's own local `.env` to the same signing secret as User and Kong; use the same issuer (default `workspace-hub`). AI trusts Kong proof instead. Restart a service after changing its `.env`; updating the file does not update an already running process. |
| `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` | Configure the actual browser origin for HTTP/socket access; Kong uses `FRONTEND_URL`. |
| Caller keys | Use the 16 directions in `backend/scripts/local-security/contract.mjs`; each key belongs at its caller and receiver only. |
| `CALENDAR_DOCUMENT_SERVICE_KEY` | Calendar and Document, at least 32 random characters; optional `CALENDAR_DOCUMENT_SERVICE_KEY_PREVIOUS` on Document during rotation. |
| `AI_GATEWAY_KEY`, `AI_DOCUMENT_SERVICE_KEY`, `RAG_SERVICE_KEY` | Dedicated AI links to Kong, Document and RAG; each purpose uses a different key. Document accepts `AI_DOCUMENT_SERVICE_KEY_PREVIOUS` during rotation. See [AI configuration](../deploy/ai/README.md#các-nhóm-biến-cấu-hình-ai). |
| `AI_TO_PROJECT_KEY`, `AI_TO_CALENDAR_KEY` | AI caller and its respective Work Assistant receiver. |
| `AI_TO_COMMUNICATION_KEY`, `COMMUNICATION_TO_AI_KEY`, `AI_SERVICE_URL` | Separate credentials for each AI/Communication direction; Communication calls AI at `AI_SERVICE_URL`. |
| `COMMUNICATION_SERVICE_URL` | Calendar's conference integration and other internal callers; use the host URL when running locally. |

`node backend/scripts/prepare-local-security-env.mjs` previews missing local
service keys and conflicts. Add `--write` to stage and back up changes. It never
rotates valid keys or changes provider/database credentials. Restart affected
processes after an intentional change. Recording/media variables are listed
in the [LiveKit guide](../backend/livekit/README.md#recording-environment).

## Schema preparation

Run schema changes explicitly with migration credentials after reviewing the
target database. Runtime roles must not run migrations.

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
[User schema reconciliation procedure](migrations.md#user-service-legacy-schema)
after a backup. Production continues to use its migration job.
For Prisma services, use `npx prisma generate`, then explicitly apply reviewed
committed migrations using `npx prisma migrate deploy`. Existing Communication
databases may need the baseline preparation described in
[migration guide](migrations.md); do not reset to resolve drift.

### Fresh local WorkspaceHub state

After stopping all seven application processes, preview the exact scope, then
run the guarded local reset if a clean development state is needed:

```powershell
node backend/scripts/reset-local-workspace.mjs
node backend/scripts/reset-local-workspace.mjs --apply
node backend/scripts/prepare-local-database.mjs --verify
node backend/scripts/validate-local-env.mjs
```

The reset rehearses every migration chain on scratch databases, backs up and
restore-tests the seven existing application databases, recreates their real
migration histories, and reapplies the restricted runtime roles. It also resets
the six WorkspaceHub Kafka topics and their dedicated consumer groups, removes
only known WorkspaceHub Redis keys and RAG collections, and preserves other
databases, Docker volumes, S3, and private backups under ignored
`.tmp/security-fresh-backups`. Never run this while application processes still
hold database connections. Start consumers before producers after reset.

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
Notebook AI is a Node API/jobs service with separate Python workers; follow
[Notebook AI setup](../deploy/ai/README.md). Install each Python worker from its
`requirements.txt`. Preserve existing `.env` files and runtime environments.

AI shares `wh_postgres` (PostgreSQL 15) and `wh_redis`: dedicated database
`notebook_db`, restricted runtime login `wh_ai`, and prefix `wh-notebook`.
The local Redis DB index comes from the existing AI `REDIS_URL` (currently 0).
Use the admin/migration credential for schema changes; host Node uses published ports.
Keep the AI database password separate from the infrastructure admin password.
The shared Redis uses AOF/everysec/noeviction; enable AOF online and wait for its
rewrite before recreating a pre-existing Redis that has only RDB persistence.

Check each service's readiness directly, then through Kong at
`http://localhost:8000/health/<service>` (for example `/health/document`). Open
`http://localhost:3000`, authenticate, and verify chat/meeting WebSocket connections
and inter-service calls. A healthy gateway alone does not prove the apps are up.
Services called by Docker infrastructure must listen on an interface reachable
through `host.docker.internal`; allow the required local firewall access.

## Recording, CI and production

Add `--profile recording` before `up -d` on the host Compose command to enable
Egress. Keep existing recording volumes. The webhook targets host Communication
at `http://host.docker.internal:8083/api/meetings/livekit/webhook`.
See [LiveKit and recording](../backend/livekit/README.md).

Use the available build, typecheck, lint, and focused regression test commands
after changes. Production builds/pushes SHA images in
GitHub Actions; EC2 pulls them, runs migration containers, checks health and rolls
back failures. See [deployment](deployment.md).
