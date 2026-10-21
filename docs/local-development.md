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
- Each application: its own `.env`; frontend uses `.env.local`.

```powershell
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml config --quiet
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml up -d --build
```

This preserves project `docker`, containers `wh_*`, network `wh_network`, and
existing PostgreSQL/Redis/recording volumes. Kafka init may exit successfully with
code 0. PostgreSQL initialization runs only for a new empty data directory; it
does not migrate an existing database. Never remove volumes as a setup step.

Kong uses `kong.host.yml` and `host.docker.internal`. To refresh only Kong:

```powershell
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml up -d --build --no-deps kong
```

Applications connect to `localhost` and the published infrastructure ports in
your `.env` (for example PostgreSQL may use 5433 rather than 5432). Set Redis and
Kafka to the published host ports. Service URLs use `http://localhost:<port>`.
Use the same JWT secret and internal service credential across services that
share them. Do not use container DNS names in host application configuration.

## Schema preparation

Run schema changes explicitly after reviewing the target database. This cleanup
does not apply migrations or reset data.

| Owner | Schema mechanism |
| --- | --- |
| User | SQL under `backend/user-service/src/main/resources/db/migration` |
| Project | SQL under `backend/project-service/database/migrations` |
| Communication, Document, Calendar, Notification | Committed Prisma migrations in each service |

User/Project deployment SQL jobs use `deploy/shared/sql-migrations` with recorded
checksums. For local existing databases, follow the service's SQL migration order
with your PostgreSQL client; do not substitute Prisma migration for Project SQL.
User Service's existing development profile uses Hibernate `ddl-auto: update`;
this refactor retains that behavior. Production continues to use its migration job.
For Prisma services, use `npx prisma generate`, then explicitly apply reviewed
committed migrations using `npx prisma migrate deploy`. Existing Communication
databases may need the baseline preparation described in
[recording setup](../meeting-recording-setup.md); do not reset to resolve drift.

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
For AI, create the environment once with `py -3.14 -m venv .venv`, then install
`requirements-dev.txt`. Preserve an existing `.env`; the AI example is for first setup.

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
See [recording setup](../meeting-recording-setup.md).

Run host unit tests through npm/Python. Production builds/pushes SHA images in
GitHub Actions; EC2 pulls them, runs migration containers, checks health and rolls
back failures. See [deployment](deployment.md).
