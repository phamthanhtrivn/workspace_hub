# Deployment configuration

This directory contains production deployment configuration and shared deployment tools.

| Directory | Purpose |
| --- | --- |
| prod/app | Web, gateway and business-service images on APP |
| prod/infra | PostgreSQL, Redis and Kafka on INFRA |
| prod/realtime | LiveKit and Egress on REALTIME |
| ai | Separately operated production AI images and database bootstrap |
| shared | SQL migration runner, PostgreSQL initialization and Kafka topic setup |
| scripts | CI validation, image catalog, release, readiness and rollback tools |

Follow [production deployment](../docs/deployment/production.md) and [migration guidance](../docs/deployment/migrations.md). Production secrets are operator-managed and remain outside Git.

Host development uses [backend/docker](../backend/docker/README.md) for infrastructure and AI. A Compose setup that runs web and all business services in Docker on one local machine is not included in this refactor; do not use EC2 configuration as a local quick start.
