# Production AI deployment

Local AI is configured in [backend/docker](../../backend/docker/README.md). This directory contains only production configuration and bootstrap tooling.

The AI stack is operated separately from the APP image release catalog. compose.production.yml uses immutable AI_IMAGE, RAG_IMAGE and SPEECH_IMAGE references (digest or sha-<40 hex> tag), private INFRA PostgreSQL/Redis, and the existing APP network workspacehub-app_default. It does not build application images or provision PostgreSQL/Redis.

## Environment and bootstrap

Keep deploy/ai/.env.production private. Set NODE_ENV=production, the private database/Redis endpoints, configured provider credentials, service URLs and the keys required by the production validator. Production has a separate credential contract; do not copy local env values or assume local directional-key changes have been rolled out there.

Bootstrap expects a dedicated notebook role/database and refuses unexpected ownership or privileges. Administrative PostgreSQL credentials are used only for bootstrap; runtime processes use the configured notebook credentials. Existing passwords are not silently rotated. Review an existing database before adopting this path.

After provisioning immutable images and reviewing the target environment, run from repository root:

~~~powershell
node backend/scripts/check-ai-infrastructure.mjs --env deploy/ai/.env.production --production
docker compose --env-file deploy/prod/app/.env --env-file deploy/ai/.env.production -f deploy/ai/bootstrap.compose.yml run --rm notebook-bootstrap
docker compose --env-file deploy/ai/.env.production -f deploy/ai/compose.production.yml config --quiet
docker compose --env-file deploy/ai/.env.production -f deploy/ai/compose.production.yml pull
docker compose --env-file deploy/ai/.env.production -f deploy/ai/compose.production.yml up -d
~~~

Use the production APP network and private INFRA access rules. Meeting summary/voice features require the speech profile (COMPOSE_PROFILES=meeting-summary), prepared speech model and matching speech key. Enable integrations only after their production receivers are configured. Database migration runs before API/jobs.

## Operations

Check API/jobs heartbeat, RAG/speech readiness, database and Redis connectivity. Readiness does not call a paid model or establish answer quality. Preserve the four-minute jobs shutdown grace period and checkpoints. Never replay an unknown model outcome automatically.

For rollback, stop the affected processes or disable new processing while preserving database, Redis, Qdrant, model volumes and original Document files. Do not delete volumes, flush Redis or redirect an active system to a stale database. See [production guide](../../docs/deployment/production.md) for release and rollback procedures.
