# Communication Service

Chat timestamps, meeting schedules/history and recording timestamps remain UTC instants. The web displays them using the user's saved account timezone, interprets meeting editor input in that zone and converts recording date filters to UTC day boundaries. No per-meeting or per-conversation timezone selector is required. See [account timezone](../../docs/features/timezones.md).

Communication also exposes lightweight workspace badge summaries (`GET /api/spaces/unread-summary` for unread channels/DMs across all Spaces, and `GET /api/meetings/badge-summary` for live and today's upcoming meetings). The web client keeps these summaries synchronized in real time by reusing the existing `/communication.io` and `/notification.io` singleton sockets without opening extra WebSocket connections.

Run this NestJS application on the host in its own terminal. Keep the existing
private .env and use localhost infrastructure/service endpoints. LiveKit URL and
credentials must match local infrastructure.

```powershell
npm ci
npx prisma generate
npm run start:dev
```

The entry point is `dist/main.js`. Build/watch clears the output directory and
keeps incremental metadata inside `dist`, so deleting build output also invalidates
its cache. Do not start the obsolete `dist/src/main` entry point.

Apply reviewed Prisma migrations explicitly. Existing recording databases have
baseline requirements: see [migration guidance](../../docs/deployment/migrations.md).
Do not reset existing data. Follow [local setup](../../docs/development/local-setup.md)
for gateway, environment scopes and readiness.

```powershell
npm run build
```

Dockerfile.production remains for CI and production runtime/migration images.
EC2 pulls built images; see [deployment](../../docs/deployment/production.md).
