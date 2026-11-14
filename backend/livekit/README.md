# LiveKit infrastructure

Local LiveKit is included by `backend/docker/docker-compose.host.yml`.
Applications run on the host. See [local setup](../../docs/local-development.md)
and the [migration guide](../../docs/migrations.md) before changing existing databases.

Keep existing `backend/docker/.env` and `backend/livekit/.env` values. Share
LIVEKIT_API_KEY/SECRET with Communication Service. Host/browser use
`ws://localhost:7880`; Egress uses `ws://livekit:7880`. Local webhook:
`http://host.docker.internal:8083/api/meetings/livekit/webhook`.

The recording page is `/recording-template`, so host development uses
`LIVEKIT_RECORDING_TEMPLATE_URL=http://host.docker.internal:3000/recording-template`
in Communication's env. `/meetings/recording-template` is not the recording page;
an HTTP response from that URL does not mean the recorder template is loaded.

```powershell
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml --profile recording config --quiet
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml --profile recording up -d livekit livekit-egress
```

Egress retains recording_backup/recording_tmp volumes, Chrome seccomp and resource
limits. The one-shot storage initializer should exit 0. Keep current image
versions. Host Communication cannot directly read a Docker named backup volume;
leave RECORDING_BACKUP_ROOT unset unless an accessible backup path is arranged.

Set `LIVEKIT_EGRESS_HEALTH_URL=http://127.0.0.1:7981/` in Communication's private
env for host development. The health port is published only on loopback; override
`LIVEKIT_EGRESS_HEALTH_PORT` in the Compose env if this port is already occupied,
and update the health URL to match. Container deployments must use the Egress
service's internal health URL. Do not publish this health endpoint publicly.
Communication probes it with a 2.5-second timeout and a five-second cache;
`ListEgress` alone does not demonstrate that a recorder is running. Restart
Communication after changing env files. Health is an admission precheck, not a
capacity reservation; a failed START is still reconciled before any redispatch.

The local RTC configuration includes loopback ICE candidates so Windows host
browsers can use the published ports while Egress uses Docker-network candidates.
This follows LiveKit's [`enable_loopback_candidate` option](https://github.com/livekit/livekit/blob/master/config-sample.yaml).
It is specific to same-machine development; production continues to advertise
its configured public IP. Check media connectivity as well as HTTP health.

Next dev currently disables `experimental.reactDebugChannel` in `next.config.ts`.
With the installed Next 16.4.3, enabling that stream left the recording template
at its server-rendered shell, without hydration or the Egress start signal, in
both dev bundlers. Production rendering and dev with that flag disabled were
verified with synthetic recordings. Keep the default Turbopack workflow.

Recording controls distinguish startup from confirmed capture and finalization.
An existing `START_UNCONFIRMED` record without an Egress/output cannot be turned
into a video; create a new recording once the dependencies are ready.

Meeting summary status includes optional availability information. The owner
starts summarization explicitly from a completed recording's player; loading
the player never queues AI work. Speech recognition runs on the local speech
worker, and the transcript goes to the configured summary model. Saved results
remain readable when new processing is unavailable, subject to recording access.

Focused checks (from each application directory):

```powershell
# backend/communication-service
npm test -- --match recording
npm run build

# backend/ai-service/api
npm run build
npm test -- --match meeting-summary

# frontend/web
npm test -- --match recording.spec
npm run typecheck
npm run build
```

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
| Webhooks/template | `LIVEKIT_EGRESS_WEBHOOK_URL` belongs in LiveKit env. `LIVEKIT_RECORDING_TEMPLATE_URL` is read by Communication Service and belongs in its env. |
| Recording readiness | `LIVEKIT_EGRESS_HEALTH_URL` belongs in Communication env and must be reachable from that runtime. `LIVEKIT_EGRESS_HEALTH_PORT` optionally overrides the loopback port published by local Compose. |
| Egress sandbox | `LIVEKIT_EGRESS_SECCOMP_PROFILE`; use the existing Chrome seccomp profile. |
| Communication authorization | `JWT_SECRET_KEY`, `JWT_ISSUER`; use the same access-token verifier settings as User Service. |
| Recording features | `MEETING_RECORDING_ENABLED`, `MEETING_RECORDING_PAUSE_ENABLED`; enable only with the corresponding media/storage setup ready. |
| Worker/limits | `MEETING_RECORDING_WORKER_ROLE`, `MEETING_RECORDING_MAX_CONCURRENT`, `MEETING_RECORDING_MAX_MINUTES`, `MEETING_RECORDING_UPLOAD_PART_MIB`, `MEETING_RECORDING_UPLOAD_CONCURRENCY`; preserve the deployment's existing worker role and capacity settings. |
| FFmpeg/workspace | `RECORDING_FFMPEG_PATH`, `RECORDING_WORK_ROOT`, `RECORDING_BACKUP_ROOT`; paths must be accessible to the host/container that reads them. |
| Storage | Keep the S3 credentials used by Communication Service in its env. The local LiveKit Compose file does not interpolate AWS variables from `backend/livekit/.env`. Configure Egress storage separately when enabling recording. |

Meeting summaries use a separate speech worker and dedicated AI credentials; see
the [AI guide](../../deploy/ai/README.md#các-nhóm-biến-cấu-hình-ai).
