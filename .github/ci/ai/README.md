# AI CI integration fixture

`compose.yml` belongs to the Python job in `.github/workflows/ci.yml`.
It builds the `ci-test` stage of `backend/ai-service/Dockerfile.production`, uses
disposable PostgreSQL and real Kong, and exposes no host ports. Test-only document,
storage and Gemini fixtures keep provider credentials and original files out of CI.
The workflow removes this separate test project after success or failure.

Local applications run on the host. Use
[local development](../../../docs/local-development.md) for application terminals
and the infrastructure-only `backend/docker/docker-compose.host.yml`.
Production retains the `production` and `migration` image targets and EC2 release flow.
