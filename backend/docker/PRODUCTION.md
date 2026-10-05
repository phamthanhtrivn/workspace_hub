> Superseded deployment notes: use [the centralized deployment guide](../../docs/deployment.md) and the files under deploy/. The content below is retained as a historical reference.

# Production images

The existing Compose files are for development. They mount source code and some
run schema-changing commands. Do not use them to deploy production images, and
do not switch only their Dockerfile names: mounts and commands would still
override the production runtime.

This guide deploys application images to existing infrastructure. Hosting must
provide PostgreSQL databases, Redis, Kafka (including the application's topics),
LiveKit, storage and mail providers. It does not provision that infrastructure.
The commands below are Bash examples. Run build commands from the repository
root on your build machine; run deployment commands on the Docker host. On a
managed hosting platform, configure the equivalent environment, service DNS,
private networking, configuration mounts and one-shot jobs through the platform.

## Build and release

Choose one immutable release tag and use it for applications and migration jobs.
Build for the hosting platform's architecture. If build and deployment machines
are different, push the images to your registry and pull the same tagged images
on the host; replace the local image names below with your registry names.

```bash
export RELEASE_TAG='<release-id>'
set -eu

for service in user-service project-service communication-service notification-service document-service calendar-service kong-gateway; do
  docker build --target production \
    -f "backend/$service/Dockerfile.production" \
    -t "wh-$service:$RELEASE_TAG" "backend/$service"
done

for service in communication-service notification-service document-service calendar-service; do
  docker build --target migration \
    -f "backend/$service/Dockerfile.production" \
    -t "wh-$service-migration:$RELEASE_TAG" "backend/$service"
done
```

Set the frontend variables in the build machine's environment before this step.
API and Nominatim URLs must be reachable from the user's browser. The Google
client ID must belong to the production OAuth configuration. `NEXT_PUBLIC_ASSET_HOST`
is optional; when set, provide only the CDN hostname, without a scheme or path.

```bash
: "${NEXT_PUBLIC_API_URL:?Set the production API URL}"
: "${NEXT_PUBLIC_GOOGLE_CLIENT_ID:?Set the Google client ID}"
: "${NEXT_PUBLIC_NOMINATIM_URL:?Set the Nominatim search endpoint}"
docker build --target production \
  -f frontend/web/Dockerfile.production \
  --build-arg NEXT_PUBLIC_API_URL \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID \
  --build-arg NEXT_PUBLIC_NOMINATIM_URL \
  --build-arg "NEXT_PUBLIC_ASSET_HOST=${NEXT_PUBLIC_ASSET_HOST:-}" \
  -t "wh-web:$RELEASE_TAG" frontend/web
```

The Dockerfile also rejects empty required arguments and names the missing
variable without printing its value. All `NEXT_PUBLIC_*` values are fixed during
the Next.js build. Changing runtime environment variables or `env_file` does not
update the client bundle or the built image configuration; build a new image
when those values change. `.env*` files are excluded from the Docker build context.

## Runtime configuration

On the host, set `RELEASE_TAG` to the released tag, `APP_NETWORK` to your private
application network and `DEPLOY_DIR` to an absolute directory outside the repo
containing per-service environment files and the rendered Kong config. Provision
the network once if it does not already exist:

```bash
export RELEASE_TAG='<release-id>'
export APP_NETWORK='<private-application-network>'
export DEPLOY_DIR='<absolute-deployment-config-directory>'
docker network create "$APP_NETWORK"
```

Create a separate `$DEPLOY_DIR/<service>.env` for each backend. Use production
credentials supplied by the hosting provider; do not copy local `.env.docker`
files unchanged or commit deployment secrets. The main configuration groups are:

| Service | Runtime configuration |
| --- | --- |
| All Nest services | `DATABASE_URL` for the service's own database; `KAFKA_BROKER` reachable from the container |
| User | `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USERNAME`, `POSTGRES_PASSWORD`; `REDIS_HOST`, `REDIS_PORT`; `KAFKA_BROKER`; `GOOGLE_CLIENT_ID`; `JWT_SECRET_KEY`; `MAIL_*`; `AWS_*` from `application.yml` |
| Project | `JWT_SECRET_KEY`, `JWT_ISSUER`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`; `COMMUNICATION_SERVICE_URL`, `DOCUMENT_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`; `INTERNAL_SERVICE_KEY`, `NOTIFICATION_INTERNAL_SERVICE_KEY` |
| Communication | `REDIS_URL`; `USER_SERVICE_URL`, `PROJECT_SERVICE_URL`, `INTERNAL_SERVICE_KEY`; `LIVEKIT_URL`, `LIVEKIT_PUBLIC_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`; `AWS_*` for S3 and CloudFront |
| Document | `PROJECT_SERVICE_URL`, `INTERNAL_SERVICE_KEY`; `AWS_*` for S3 |
| Calendar | `USER_SERVICE_URL`, `DOCUMENT_SERVICE_URL`; `AWS_CLOUDFRONT_URL` for the Pomodoro audio origin |
| Notification | `FRONTEND_URL`, `INTERNAL_SERVICE_KEY`; `MAIL_*`; `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |

Use the same JWT secret in User, Project and Kong, and matching internal service
keys on calling/receiving services. Service URLs must use private DNS endpoints,
not `localhost` (which refers to the current container). Kafka's advertised
addresses must also be reachable from the containers. LiveKit's public URL must
be browser-reachable. Match backend `GOOGLE_CLIENT_ID` to the frontend build value.

The production defaults are:

| Image | Internal port | Process |
| --- | --- | --- |
| user-service | 8081 | `java -jar app.jar`, production Spring profile |
| project-service | 8082 | `node dist/main.js` |
| communication-service | 8083 | `node dist/main.js` |
| notification-service | 8084 | `node dist/main.js` |
| document-service | 8085 | `node dist/main.js` |
| calendar-service | 8086 | `node dist/main.js` |
| web | 3000 | `node server.js`, bound to `0.0.0.0` |

Do not override production commands with `start:dev`, `prisma generate` or
`prisma db push --accept-data-loss`. Generated clients are already in the image.
Do not mount source, `node_modules`, `dist` or `.next` over the image's files.
If you override ports, update Kong upstream URLs and readiness probes accordingly.

## Apply schema changes before starting the new release

Keep all migration files in source control. Back up each database and inspect
its migration history before applying pending changes. Run one migration job
per service/database and release, rather than one job per application replica.
Abort deployment on any migration failure.

Communication, Notification, Document and Calendar use Prisma Migrate. Run
`migrate status` first; pending migrations can cause a nonzero status exit, so
inspect the result. If a database was previously created using `db push` or has
schema drift/missing history, reconcile and baseline its actual schema before
deployment. Do not reset the database or mark migrations applied without
verifying their SQL effects.

```bash
# Example status check; the migration image's entrypoint is Prisma.
docker run --rm --network "$APP_NETWORK" \
  --env-file "$DEPLOY_DIR/communication-service.env" \
  "wh-communication-service-migration:$RELEASE_TAG" migrate status
```

After reviewing the four databases, run the jobs in a shell that stops on failure:

```bash
set -eu
for service in communication-service notification-service document-service calendar-service; do
  docker run --rm --network "$APP_NETWORK" \
    --env-file "$DEPLOY_DIR/$service.env" \
    "wh-$service-migration:$RELEASE_TAG"
done
```

Project uses SQL under `backend/project-service/database/migrations`, not Prisma
Migrate. It intentionally has no `migration` image target. Apply only SQL files
not already applied, using the deployment's database migration tool and recorded
history, in numeric version order. Do not replay the entire directory on an
existing database. Two files currently use version `V20`:

- `V20__add_project_document_permission.sql`
- `V20__add_task_document_attachments.sql`

Version-only tools can reject this duplicate. Check the existing runner and
applied history before deployment; do not rename applied files or silently skip
either change. This image update does not rewrite that history or choose a new
SQL migration runner.

User's SQL is under `backend/user-service/src/main/resources/db/migration` and
must be applied separately through the database workflow. Its production image
defaults to `SPRING_PROFILES_ACTIVE=production`, with Hibernate validation,
SQL logging disabled and automatic Flyway execution disabled. Do not override
the profile with development settings or use Hibernate schema updates as a
migration runner. A missing/incompatible schema must block application startup.

Do not delete Prisma migrations: jobs and new environments need their SQL and
history. Squashing into a new baseline is a separate database change requiring
an inventory of existing histories. Runtime images already exclude migration
directories; deleting source migrations does not reduce their size.

## Start applications and Kong

After successful schema jobs, use the backend service names as container names
on the shared network so they match `kong.docker.yml`. The following commands
assume these names are free. For an existing deployment, replace containers
through the hosting platform's rollout mechanism instead of rerunning these
commands against occupied names. Do not delete database volumes during rollout.

```bash
set -eu
for service in user-service project-service communication-service notification-service document-service calendar-service; do
  docker run -d --name "$service" --network "$APP_NETWORK" \
    --restart unless-stopped \
    --env-file "$DEPLOY_DIR/$service.env" \
    "wh-$service:$RELEASE_TAG"
done
```

Prepare `$DEPLOY_DIR/kong.yml` from `backend/kong-gateway/kong.docker.yml` using
the hosting platform's secret/configuration tooling. Replace `$JWT_SECRET_KEY`
and every `$FRONTEND_URL` placeholder with correctly YAML-quoted values; Kong
does not substitute these placeholders itself. The origin must be the actual
frontend origin. Never commit the rendered file or put its secret into a build
argument/image layer. Make the file readable by the container's `kong` user
while restricting access on the host. If hosting uses different service names
or ports, update upstream URLs in this deployment copy.

The production image defaults to DB-less mode, enables `bundled,jwt-user-context`,
disables the Admin API and reads `/usr/local/kong/declarative/kong.yml`. Validate
the rendered file and custom plugin schemas before starting the proxy:

```bash
set -eu
docker run --rm \
  --mount "type=bind,source=$DEPLOY_DIR/kong.yml,target=/usr/local/kong/declarative/kong.yml,readonly" \
  "wh-kong-gateway:$RELEASE_TAG" \
  kong config parse /usr/local/kong/declarative/kong.yml

docker run -d --name kong --network "$APP_NETWORK" \
  --restart unless-stopped \
  --mount "type=bind,source=$DEPLOY_DIR/kong.yml,target=/usr/local/kong/declarative/kong.yml,readonly" \
  -p 127.0.0.1:8000:8000 \
  "wh-kong-gateway:$RELEASE_TAG"

docker run -d --name frontend-web --network "$APP_NETWORK" \
  --restart unless-stopped -p 127.0.0.1:3000:3000 \
  "wh-web:$RELEASE_TAG"
```

`kong config parse` checks the declarative config without importing it; see the
[Kong 3.9.1 CLI source](https://github.com/Kong/kong/blob/3.9.1/kong/cmd/config.lua).
Do not proceed if validation fails or placeholders remain. These examples put
the web and proxy behind a host HTTPS reverse proxy; configure its domains and
WebSocket forwarding to match the frontend's build-time API URL. On managed
hosting, expose them through the platform's HTTPS routing instead. Publish only
proxy traffic from Kong, never Admin API ports 8001/8444. The configuration is
mounted read-only; secret/config changes require validating and rolling out the
new configuration.

## Readiness and release verification

All six backends expose `/ready` on their internal ports. Configure the hosting
platform to probe these endpoints and keep traffic off unready instances. For
the host example, the template routes let you check them through Kong:

```bash
set -eu
for service in user project communication notification document calendar; do
  curl --fail --silent --show-error "http://127.0.0.1:8000/health/$service"
done
curl --fail --silent --show-error http://127.0.0.1:3000/ >/dev/null
```

Retry probes during startup according to your hosting platform's readiness
policy. Confirm database/Kafka connectivity, login, Google OAuth, location search,
file access and WebSocket connections before directing production traffic to the
release. An application image rollback does not undo database migrations;
verify schema compatibility before rolling back an application.
