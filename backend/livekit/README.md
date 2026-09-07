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
```

## Start

From the repository root:

```bash
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.yml up -d livekit
```

LiveKit uses the shared `redis` service on `wh_network`.
