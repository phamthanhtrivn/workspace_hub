# Backend services on the host

`docker-compose.host.yml` runs PostgreSQL, Redis, Kafka, Kong and LiveKit in
Docker. Run the backend services, AI API/worker and frontend directly on the host.
See [local development](../../docs/local-development.md) for application terminals and migrations.

Run from the repository root, using the existing environment files:

- `backend/docker/.env`: database credentials, infrastructure ports and LiveKit.
- `backend/kong-gateway/.env`: `FRONTEND_URL` and `JWT_SECRET_KEY`.
- `backend/livekit/.env`: the included LiveKit/recording configuration.
- Node/Python applications use their own env files. Inject User Service variables through the IDE or terminal; Java does not automatically load .env.

Validate the configuration:

```powershell
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml config --quiet
```

Start the infrastructure and gateway:

```powershell
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml up -d --build
```

If the infrastructure is already running and only Kong needs the new AI routes:

```powershell
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml up -d --build --no-deps kong
```

Kong loads `kong.host.yml` through the image's startup template renderer and
forwards application calls to `host.docker.internal`. Proxy HTTP is on port 8000;
the local Admin API is bound to loopback on port 8001. After starting host services,
check `/health/ai` and `/health/document` through Kong. Gateway readiness itself
does not imply that the host application services are running.

The Compose project remains `docker`, with `wh_*` container names, `wh_network`,
`docker_postgres_data` and `docker_redis_data`. The infrastructure image digests
match the existing local stack. Rebuilding only Kong does not recreate the database,
Redis, Kafka or LiveKit. Stop services without removing their volumes; do not use
`down -v` for this stack if you want to retain your local data.

Recording remains optional:

```powershell
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml --profile recording up -d
```
