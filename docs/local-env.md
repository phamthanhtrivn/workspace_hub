# Local environment contract

Keep each private `.env` in its service directory. Node services load their
own file; User Service needs its variables supplied by the IDE or terminal.
The frontend uses `frontend/web/.env` for host development and `.env.docker`
for its Docker build. Neither private values nor example env files are stored
in the repository.

Run from the repository root:

```powershell
node backend/scripts/prepare-local-security-env.mjs
node backend/scripts/validate-local-env.mjs
node backend/scripts/check-ai-infrastructure.mjs --env backend/ai-service/api/.env
```

Preparation is a dry run unless `--write` is supplied. It generates a distinct
credential for each caller/receiver edge only when missing, preserves existing
provider keys and database URLs, and backs up each changed file under ignored
`.tmp/security-env-backups`. The validator reports variable **names** only.
Its reader inventory is `docs/local-env-contract.json`; the 16 caller/receiver
edges and route scopes are defined in `backend/scripts/local-security/contract.mjs`.

The current local setup uses the same `postgres` username/password from
`backend/docker/.env` in all seven application `.env` files. Each service still
uses its own database on the single `wh_postgres` container, including AI's
`notebook_db`. This shared administrator credential does not provide database
permission isolation. The private, Git-ignored
`backend/.env.security-db-plan.json` remains available for migration tooling
and must not be published. Restricted `wh_*` roles are an optional later cutover.

Compose needs both infrastructure and LiveKit interpolation files:

```powershell
docker compose --env-file backend/docker/.env --env-file backend/livekit/.env -f backend/docker/docker-compose.host.yml config --quiet
```

For host services, use the published PostgreSQL/Redis/Kafka ports and local
service URLs already configured on this machine. Kong inside Docker reaches
host services via `host.docker.internal`. Optional flags remain at their
existing values; a disabled feature does not require unused optional keys.
Production/CI still have a separate legacy contract and need their own rollout.

User Service requires `FRONTEND_URL` to match the browser frontend origin,
including its scheme and port (for example, `http://localhost:3000`). Cookie-based
refresh and logout reject other origins before changing the session. Browser
requests must supply a matching `Origin` or `Referer`; a native client without
browser Fetch Metadata can continue using the refresh cookie without those headers.
Supply this setting to the User JVM through the same IDE or terminal environment
as its other variables; merely editing `.env` does not load it into Java.

Local S3 credentials, private asset references and bucket requirements are
documented in [local S3](local-s3.md).

## Web Push provider hostnames

`backend/notification-service/.env` must allow the exact hostname returned by the
browser's push subscription. For the Windows endpoint observed locally:

```dotenv
WEB_PUSH_ALLOWED_HOSTS=fcm.googleapis.com,wns2-pn1p.notify.windows.com
```

Keep existing providers when adding another hostname. Do not use wildcards; a
different Windows endpoint must be added explicitly after checking its provider.
Restart notification-service after changing this value, then refresh the web app
to retry subscription registration. A rejected push subscription affects browser
push delivery; notification persistence and bell updates use separate paths.
