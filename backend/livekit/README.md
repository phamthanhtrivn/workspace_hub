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

## Native Windows development

LiveKit can run directly on Windows while the existing communication backend remains in its container. Run the downloaded Windows binary with public development credentials, bound to this machine:

```powershell
livekit-server.exe --dev --bind 127.0.0.1 --node-ip 127.0.0.1
```

Create the ignored `backend/communication-service/.env.local` file:

```env
LIVEKIT_URL=http://host.docker.internal:7880
LIVEKIT_PUBLIC_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

For a backend running directly on Windows, use `http://127.0.0.1:7880` for `LIVEKIT_URL`. The communication service loads `.env.local` overrides only outside production; restart the existing backend after changing this file. This setup supports browsers on the same machine. Cloud recording and live captions require their corresponding services to be configured separately.

On 2026-10-13, an authenticated request to `POST /api/meetings/instant` and a Chromium join with synthetic camera and microphone succeeded using native LiveKit v1.13.5. The server received audio and video packets, the browser reported no JavaScript errors, and the temporary account and meeting were removed afterward. LiveKit connection failures now return HTTP 503 with a specific media-server message instead of the generic HTTP 500 `fetch failed` response.

## Meeting cloud recording

The `recording` Compose profile starts `livekit-egress:v1.15.0` with durable temporary/backup volumes, CPU/memory limits, Chrome sandboxing and the upstream seccomp profile. The communication service submits MP4 720p composition requests with per-request private S3 storage and signed webhooks.

Configure the values in `recording.env.example` and `../communication-service/recording.env.example`, then follow [meeting-recording-setup.md](../../meeting-recording-setup.md) for database preparation, launch commands, S3 CORS/lifecycle and acceptance checks.
