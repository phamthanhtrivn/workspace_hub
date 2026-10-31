# LiveKit infrastructure

Local LiveKit is included by `backend/docker/docker-compose.host.yml`.
Applications run on the host. See [local setup](../../docs/local-development.md)
and the [migration guide](../../docs/migrations.md) before changing existing databases.

Keep existing `backend/docker/.env` and `backend/livekit/.env` values. Share
LIVEKIT_API_KEY/SECRET with Communication Service. Host/browser use
`ws://localhost:7880`; Egress uses `ws://livekit:7880`. Local webhook:
`http://host.docker.internal:8083/api/meetings/livekit/webhook`.

```powershell
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml --profile recording config --quiet
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml --profile recording up -d livekit livekit-egress
```

Egress retains recording_backup/recording_tmp volumes, Chrome seccomp and resource
limits. The one-shot storage initializer should exit 0. Keep current image
versions. Host Communication cannot directly read a Docker named backup volume;
leave RECORDING_BACKUP_ROOT unset unless an accessible backup path is arranged.

Production retains REALTIME EC2, private INFRA Redis and image deployment through
GitHub Actions. See [deployment](../../docs/deployment.md).
