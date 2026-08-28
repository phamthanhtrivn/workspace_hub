# LiveKit Self-Hosted Foundation

This folder contains the local self-hosted LiveKit server setup for WorkSpaceHub. It uses the official `livekit/livekit-server` Docker image and the existing WorkSpaceHub Redis service on `wh_network`.

## Architecture

```text
Browser
  |
  | ws://localhost:7880
  v
LiveKit
  |
  +-- Redis
  +-- WebRTC
```

```text
communication-service
  |
  | ws://livekit:7880
  v
LiveKit
```

Browser code must use `ws://localhost:7880` for local development because Docker hostnames such as `livekit` do not resolve in the browser. Services running inside Docker should use `ws://livekit:7880`.

## Environment Variables

LiveKit server values are loaded by the root backend Docker compose environment:

```env
LIVEKIT_PORT=7880
LIVEKIT_RTC_TCP_PORT=7881
LIVEKIT_RTC_UDP_PORT=7882
LIVEKIT_API_KEY=replace_me
LIVEKIT_API_SECRET=replace_me
```

`communication-service` also needs:

```env
LIVEKIT_URL=ws://livekit:7880
LIVEKIT_PUBLIC_URL=ws://localhost:7880
LIVEKIT_API_KEY=replace_me
LIVEKIT_API_SECRET=replace_me
```

Use matching API key and secret values for LiveKit server and `communication-service`. `LIVEKIT_URL` is used by backend infrastructure clients, while `LIVEKIT_PUBLIC_URL` is returned to the browser. Do not commit production credentials.

## Start

From the repository root:

```bash
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.yml up -d redis livekit communication-service
```

For the host compose variant:

```bash
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml up -d redis livekit
```

## Verify

```bash
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.yml config
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.yml ps redis livekit communication-service
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.yml logs livekit
```

Check that:

- Redis is healthy.
- LiveKit is running.
- LiveKit logs do not show invalid config, invalid API key config, Redis connection refused, network binding errors, or port conflicts.
- TCP `7880` and `7881` are exposed.
- UDP `7882` is mapped.
- `communication-service` uses `ws://livekit:7880` inside Docker and returns `ws://localhost:7880` to local browsers.

No LiveKit healthcheck is configured here because the official image does not provide a simple documented container-local health command for this setup. Avoid fake checks that depend on tools such as `curl` being present in the image.

## Production Notes

This setup is for local single-node development. Production/public Internet deployment needs separate infrastructure decisions for:

- TLS and browser `wss://livekit.<domain>` access.
- A trusted public domain and certificate.
- Firewall rules for WebRTC ports.
- Public IP handling, including `rtc.use_external_ip` where appropriate.
- TURN for restrictive networks.
- Reverse proxy or layer 4 networking for signaling and media as appropriate.

Do not route WebRTC media ports `7881` or `7882/udp` through Kong HTTP routes. Kong should continue to serve WorkSpaceHub REST APIs; browser media traffic should connect to LiveKit directly.
