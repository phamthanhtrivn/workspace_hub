# LiveKit Self-Hosted Foundation

Local LiveKit setup for WorkSpaceHub. The main backend Docker Compose files include this compose file so LiveKit can stay owned by `backend/livekit`.

## Local URLs

- Browser URL: `ws://localhost:7880`
- Docker service URL: `ws://livekit:7880`

## Environment

Values are loaded from `backend/docker/.env`:

```env
LIVEKIT_PORT=7880
LIVEKIT_RTC_TCP_PORT=7881
LIVEKIT_RTC_UDP_PORT=7882
LIVEKIT_API_KEY=replace_me
LIVEKIT_API_SECRET=replace_me
LIVEKIT_EGRESS_WEBHOOK_URL=http://host.docker.internal:8083/api/meetings/livekit/webhook
```

## Start

From the repository root:

```bash
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.yml up -d livekit
```

LiveKit uses the shared `redis` service on `wh_network`.

## Meeting cloud recording

The `recording` Compose profile starts `livekit-egress:v1.15.0` with durable temporary/backup volumes, CPU/memory limits, Chrome sandboxing and the upstream seccomp profile. The communication service submits MP4 720p composition requests with per-request private S3 storage and signed webhooks.

Configure the values in `recording.env.example` and `../communication-service/recording.env.example`, then follow [meeting-recording-setup.md](../../meeting-recording-setup.md) for database preparation, launch commands, S3 CORS/lifecycle and acceptance checks.
