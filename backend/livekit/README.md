# LiveKit Self-Hosted Foundation

LiveKit development config stays here; orchestration uses the centralized
`deploy/dev/compose.yml` realtime profile. Production runs LiveKit and Egress on
their own EC2 host. See [deployment documentation](../../docs/deployment.md).

## Local URLs

- Browser URL: `ws://localhost:7880`
- Docker service URL: `ws://livekit:7880`

## Environment

Values are loaded from `deploy/dev/.env`:

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
docker compose --env-file deploy/dev/.env -f deploy/dev/compose.yml --profile realtime up -d livekit egress
```

Development LiveKit uses the stack's Redis on its default network. Production
uses INFRA's private Redis address, rendered from the operator-managed
`/opt/workspacehub/realtime/.env.production` file.

## Meeting cloud recording

The communication service submits MP4 720p composition requests with per-request
private S3 storage and signed webhooks. Recording settings are documented in
`recording.env.example` and `../communication-service/recording.env.example`.

The centralized stacks currently provide the Egress foundation. The recording
configuration from the legacy Compose stack still needs to be integrated:
recording environment variables, durable temporary/backup storage, resource
limits and Chrome sandboxing. APP and REALTIME run on separate production hosts,
so a local Docker volume cannot share backup files between them.

See [meeting-recording-setup.md](../../meeting-recording-setup.md) for recording
behavior, S3 CORS/lifecycle and acceptance checks. Its legacy Compose commands and
development database preparation do not replace the centralized deployment and
committed production migrations described in [deployment documentation](../../docs/deployment.md).
