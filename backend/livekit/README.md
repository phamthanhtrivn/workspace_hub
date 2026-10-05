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
uses EC2-3's private Redis address, rendered from Parameter Store values.
