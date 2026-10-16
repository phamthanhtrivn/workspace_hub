# Kong Gateway

Kong is the API gateway for Workspace Hub. It verifies JWT tokens, injects trusted user context headers, and routes traffic to the backend microservices.

## Runtime Configs

Use one declarative config per runtime:

- `kong.docker.yml`: for production and isolated CI E2E. Upstreams use Docker service names on `wh_network`.
- `kong.host.yml`: for running Kong in Docker while backend services run directly on the host machine. Upstreams use `host.docker.internal`.

For backend services running on the host, use the restored host Compose file:

```powershell
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml up -d --build --no-deps kong
```

It mounts the host template at the path used by the current image renderer:

```yaml
volumes:
  - ../kong-gateway/kong.host.yml:/usr/local/kong/declarative/kong.template.yml:ro
```

See [host setup](../docker/README.md) for infrastructure, environment files and
preserving existing local volumes. The host proxy listens on port 8000; its Admin
API binds to loopback on port 8001. Host and release builds share
`Dockerfile.production`; the host stack mounts `kong.host.yml`.

## Production image

`Dockerfile.production` defaults to DB-less mode, enables the custom plugin and
disables the Admin API. Its startup renderer substitutes `FRONTEND_URL` and
`JWT_SECRET_KEY` into the bundled template using quoted YAML scalars and writes
the private runtime config to `/tmp/kong.yml`. Secrets are supplied at runtime.
See [deployment documentation](../../docs/deployment.md) for validation and releases.

## Security Notes

- Clients should call services through Kong, not directly through microservice ports.
- In production, keep service-to-service traffic on an internal Docker/network layer and expose Kong as the public entrypoint.
- The custom `jwt-user-context` plugin clears spoofable `X-User-*` request headers before injecting verified user context.

