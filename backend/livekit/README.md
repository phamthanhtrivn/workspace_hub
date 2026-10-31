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

## Recording environment

Keep values in private env files; no env example file is required. Share credentials
only between their intended callers/receivers and use addresses appropriate to
host or Docker execution.

| Group | Variables |
| --- | --- |
| LiveKit | `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`, `LIVEKIT_PUBLIC_URL`. API credentials must match Communication/LiveKit/Egress; public URL must be reachable by browsers. |
| Local published ports | `LIVEKIT_PORT`, `LIVEKIT_RTC_TCP_PORT`, `LIVEKIT_RTC_UDP_PORT`; keep the existing port mappings. |
| Webhooks/template | `LIVEKIT_EGRESS_WEBHOOK_URL`, `LIVEKIT_RECORDING_TEMPLATE_URL`; point to the actual receiver/template, reachable from Egress. |
| Egress sandbox | `LIVEKIT_EGRESS_SECCOMP_PROFILE`; use the existing Chrome seccomp profile. |
| Communication authorization | `JWT_SECRET_KEY`, `JWT_ISSUER`; use the same access-token verifier settings as User Service. |
| Recording features | `MEETING_RECORDING_ENABLED`, `MEETING_RECORDING_PAUSE_ENABLED`; enable only with the corresponding media/storage setup ready. |
| Worker/limits | `MEETING_RECORDING_WORKER_ROLE`, `MEETING_RECORDING_MAX_CONCURRENT`, `MEETING_RECORDING_MAX_MINUTES`, `MEETING_RECORDING_UPLOAD_PART_MIB`, `MEETING_RECORDING_UPLOAD_CONCURRENCY`; preserve the deployment's existing worker role and capacity settings. |
| FFmpeg/workspace | `RECORDING_FFMPEG_PATH`, `RECORDING_WORK_ROOT`, `RECORDING_BACKUP_ROOT`; paths must be accessible to the host/container that reads them. |
| Storage | `AWS_REGION`, `AWS_S3_BUCKET_NAME`, `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`; use the deployment credential source. For compatible storage, configure `AWS_S3_ENDPOINT` and `AWS_S3_FORCE_PATH_STYLE` as needed. |

Meeting summaries use a separate speech worker and dedicated AI credentials; see
the [AI guide](../../deploy/ai/README.md#các-nhóm-biến-cấu-hình-ai).
