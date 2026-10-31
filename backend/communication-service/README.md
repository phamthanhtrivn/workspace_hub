# Communication Service

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
baseline requirements: see [migration guidance](../../docs/migrations.md).
Do not reset existing data. Follow [local setup](../../docs/local-development.md)
for gateway, environment scopes and readiness.

```powershell
npm run build
```

Dockerfile.production remains for CI and production runtime/migration images.
EC2 pulls built images; see [deployment](../../docs/deployment.md).
