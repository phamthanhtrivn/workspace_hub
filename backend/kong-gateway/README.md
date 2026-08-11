# Kong Gateway

Kong is the API gateway for Workspace Hub. It verifies JWT tokens, injects trusted user context headers, and routes traffic to the backend microservices.

## Runtime Configs

Use one declarative config per runtime:

- `kong.docker.yml`: for the full Docker Compose stack. Upstreams use Docker service names on `wh_network`.
- `kong.host.yml`: for running Kong in Docker while backend services run directly on the host machine. Upstreams use `host.docker.internal`.

The full stack compose file mounts `kong.docker.yml` by default:

```yaml
volumes:
  - ../kong-gateway/kong.docker.yml:/usr/local/kong/declarative/kong.yml
```

To use host-mode routing, change that mount to `kong.host.yml`.

## Local Docker

From `backend/docker`:

```bash
docker compose up -d --build
```

Kong listens on:

- Proxy: `http://localhost:8000`
- Admin API: `http://localhost:8001`

Verify logs:

```bash
docker logs wh_kong
```

## Security Notes

- Clients should call services through Kong, not directly through microservice ports.
- In production, keep service-to-service traffic on an internal Docker/network layer and expose Kong as the public entrypoint.
- The custom `jwt-user-context` plugin clears spoofable `X-User-*` request headers before injecting verified user context.

