# Local infrastructure and AI

The backend applications and web run on the host. This Compose project runs PostgreSQL, Redis, Kafka, Kong, LiveKit, Egress and all AI processes, including speech. Production is configured separately under [deploy](../../deploy/README.md).

## Configuration

Run commands from the repository root. Docker Compose with include support (2.20 or newer) is required.

| Folder | Private environment | Responsibility |
| --- | --- | --- |
| infra | infra/.env | PostgreSQL credentials and published infrastructure ports |
| gateway | gateway/.env | Frontend origin, JWT verifier and AI gateway proof |
| realtime | realtime/.env | LiveKit keys, webhook and published media/health ports |
| ai | ai/.env | AI credentials, feature flags, models, quotas, worker settings and Docker URLs |

Compose loads each environment through its include entry. Do not pass a global application env file: it can override component-specific interpolation. Keep conflicting variables out of your shell environment as well.

The existing local private files have been migrated. On another checkout with the old private files and host AI configuration, preview and apply:

~~~powershell
node backend/scripts/prepare-local-docker-env.mjs
node backend/scripts/prepare-local-docker-env.mjs --write
node backend/scripts/validate-local-docker-env.mjs
~~~

The preparation tool copies model, quota, timeout and concurrency choices from the host AI env, preserves credentials, rewrites connection URLs for Docker, and retains the configured media hostname allowlist. It backs up source files in ignored .tmp/local-docker-env-backups before retiring legacy Docker env locations. Host application env files remain in place. Run it again after intentionally changing host AI settings to synchronize Docker; inspect its dry run first. It never generates or rotates credentials.

For a new machine, provision private component files using the variable names in each Compose file and [environment guide](../../docs/development/environment.md). Preparation requires configured host application credentials; it is not a secret generator.

## Start, inspect and stop

~~~powershell
docker compose -f backend/docker/compose.yml config --quiet
docker compose -f backend/docker/compose.yml up -d --build
docker compose -f backend/docker/compose.yml ps -a
docker compose -f backend/docker/compose.yml logs -f notebook-api notebook-jobs livekit-egress
docker compose -f backend/docker/compose.yml stop
~~~

Egress and speech start by default. Allow enough Docker memory for Egress (4 GiB limit), speech (3 GiB), RAG (2 GiB by default) and the shared services; limits do not allocate memory or guarantee that the Docker VM has enough RAM. Cold builds/model preparation take longer than warm starts. AI readiness also requires host User/Document and the configured integration services.

Keep the four-minute jobs shutdown grace period so in-flight work can checkpoint. Do not remove volumes when stopping.

## Select a group

Component files are composed through the root entrypoint because they share networks and dependencies. From the repository root:

~~~powershell
# Infrastructure; AI and realtime dependencies also start it when needed.
docker compose -f backend/docker/compose.yml up -d postgres redis kafka kafka-init
# Gateway
docker compose -f backend/docker/compose.yml up -d --build kong
# Meetings and recording
docker compose -f backend/docker/compose.yml up -d livekit egress-storage-init livekit-egress
# AI (includes dependency startup and database migration)
docker compose -f backend/docker/compose.yml up -d --build notebook-api notebook-jobs
# Stop AI without stopping the shared infrastructure.
docker compose -f backend/docker/compose.yml stop notebook-api notebook-jobs rag-worker speech-worker notebook-qdrant
~~~

## Transition from the previous AI stack

Stop and remove only the old AI containers before the first combined start, otherwise the API port and queue consumers can conflict. Inspect the names and labels first:

~~~powershell
docker ps -a --filter label=com.docker.compose.project=wh-notebook --format '{{.Names}}'
$legacyAIContainers = @(docker ps -a --filter label=com.docker.compose.project=wh-notebook --format '{{.Names}}')
if ($legacyAIContainers.Count -gt 0) {
    docker stop --timeout 240 $legacyAIContainers
    docker rm $legacyAIContainers
}
docker compose -f backend/docker/compose.yml up -d --build
~~~

These commands remove containers, not volumes. Keep wh-notebook_notebook-qdrant and wh-notebook_notebook-models: the combined project explicitly reuses them. Compose may report their previous project ownership; do not delete them to silence that warning. PostgreSQL, Redis and recording retain project docker and their existing volume names. The AI private network is recreated independently of data; wh_network is preserved.

The local notebook-db-init job creates notebook_db only if missing, verifies access, and never alters an existing owner/password. Migration runs before API/jobs. Other application migrations remain explicit; see [migrations](../../docs/deployment/migrations.md). Successful initializer/migration containers normally exit with code 0.

## Readiness

~~~powershell
Invoke-RestMethod http://127.0.0.1:8087/ready
Invoke-RestMethod http://127.0.0.1:7981/
~~~

Health checks do not certify media connectivity, provider quota or output quality. Check [local setup](../../docs/development/local-setup.md) for host terminals and [recording](../livekit/README.md) for Communication settings. Never run a second host AI API on port 8087 while Docker AI is running.

## Troubleshooting AI gateway errors

A healthy Kong does not mean the AI stack is running. If only PostgreSQL, Redis, Kafka and Kong were started, AI routes can return 503 with `name resolution failed`: a stopped API has no usable Docker DNS endpoint. Check the full stack before retrying in the app:

~~~powershell
docker compose -f backend/docker/compose.yml ps -a
docker compose -f backend/docker/compose.yml up -d --build
Invoke-RestMethod http://127.0.0.1:8087/ready
~~~

Start the host User/Document and other required applications as well. API, jobs, RAG, speech and Qdrant must be running; database/migration initializers should normally exit 0. Inspect exit codes and `OOMKilled` before diagnosing a memory problem: exit 137 alone is not proof of OOM.

Intermittent 502 immediately after API recreation can indicate a cached old IP. The local gateway limits positive DNS TTL and stale records to five seconds each, and negative/error records to one second. The AI route still has zero proxy retries: requests that might generate model output must not be replayed automatically. These settings apply only to local Docker, not production.

After applying gateway environment changes, first make sure the API is available, then explicitly recreate only Kong to clear every worker's previous DNS cache:

~~~powershell
docker compose -f backend/docker/compose.yml up -d --no-deps --force-recreate kong
~~~

Short DNS caches cannot make an unavailable API serve traffic during a rebuild. Work Assistant stops background retries after a failed history/list read; use **Retry** after recovery or close and reopen the panel. Existing conversation content is not retained after panel closure, and failed generation requests are not automatically resent. Logs remain available with the existing sanitization/throttling.
