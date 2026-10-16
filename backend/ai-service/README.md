# AI Service

Python 3.12/3.14 / FastAPI document question answering for WorkSpaceHub. Each private
conversation pins 1–5 document revisions. MarkItDown converts validated documents;
retrieval combines embeddings and BM25, and Gemini answers with citations.

See [document QA setup, API workflow and limitations](DOCUMENT_QA.md) for enabling
the feature, file validation, migrations, worker, Kong and production configuration.
AI is disabled by default until the operator configures a demo project and quota.

## Run locally

From `backend/ai-service`, using Python 3.12 or 3.14 (Docker uses 3.12):

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m app.main
```

On a host with Python 3.14, use `py -3.14 -m venv .venv` instead. MarkItDown is
pinned to 0.1.8: older 0.1.3 forces an ONNX Runtime version on Windows that has
no Python 3.14 wheel. If a previous dependency install failed, rerun
`.\.venv\Scripts\python.exe -m pip install --no-cache-dir -r requirements-dev.txt`,
then `pip check` and `pytest` through the same virtual environment. A successful
`pip check` alone does not confirm that all requirements were installed.

Host execution reads `backend/ai-service/.env`. Use a SQLAlchemy connection URL
such as `postgresql+psycopg://USER:PASSWORD_URLENCODED@localhost:5432/ai_db`,
without Prisma's `?schema=public` parameter. After changing connection settings,
restart both API and worker so their database engines use the updated URL.

`HOST`, `PORT`, `NODE_ENV`, `LOG_LEVEL`, and `CORS_ALLOWED_ORIGINS` are validated
on startup. Origins use a comma-separated list; wildcard credentialed CORS is
rejected. The example uses port 8087. Development reload is enabled automatically;
production disables reload, Swagger UI, and the OpenAPI endpoint.

Apply Alembic explicitly, then start the worker in a separate host terminal:

```powershell
.\.venv\Scripts\python.exe -m app.infrastructure.migrate
.\.venv\Scripts\python.exe -m app.modules.jobs.worker
```

See [local development](../../docs/local-development.md). Production uses
`Dockerfile.production` with `production` and `migration` targets; `ci-test`
is reserved for the GitHub Actions E2E fixture.

## HTTP contract

The response interceptor follows Communication Service's Nest interceptor.
JSON responses use the same fields:

```json
{
  "success": true,
  "message": "AI service is healthy",
  "data": {"service": "ai-service", "status": "ok"},
  "errors": null,
  "timestamp": "2026-10-16T00:00:00.000Z"
}
```

Handlers may return raw JSON-compatible values, or `{message, data, pagination?}`.
The interceptor wraps once, preserves HTTP status/headers/cookies/background
tasks, and keeps optional `pagination` at the top level. Existing envelopes pass
through. File/text responses, streams, redirects, HEAD, and bodyless statuses
retain their transport semantics. Swagger/OpenAPI are framework documents and
are not wrapped.

Use `ApiRouter` from `app.common.interceptors.response_interceptor` for module
routers. Plain FastAPI `APIRouter` does not inherit a parent router's route class.
When adding a JSON endpoint, declare the public `ApiResponse[YourPayload]` schema
in its `responses` metadata, as demonstrated by the health router; wrapping
happens after normal FastAPI serialization and response-model validation.

The global exception filter produces the same error envelope:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": {"nested": {"title": "Field required"}},
  "timestamp": "2026-10-16T00:00:00.000Z"
}
```

Request validation, including invalid JSON, returns **400**, matching Nest's
validation pipe rather than FastAPI's default 422. Field errors retain nested
structure and omit submitted values. HTTP exceptions preserve their status and
headers; controlled exceptions can supply `detail={message, errors?, code?}`.
Unexpected exceptions and invalid response models return **500** with
`Internal server error`; internal exception text stays out of the response.
Future body/query endpoints must also document the 400 validation contract.

`X-Request-ID` is echoed or generated, exposed through CORS, and included in
request/error logs. Request bodies, authorization headers, and query strings are
not logged by the request middleware. The correlation ID stays in headers to
preserve the existing Nest response body shape.

## Health and verification

`/health` reports liveness. `/ready` is 200 only during the application lifespan,
and 503 otherwise. With AI enabled, readiness also verifies the database migration
revision. It does not call Gemini or claim that external storage is available.
With AI disabled only health routes exist; enabled feature routes require JWT.

```powershell
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m pytest
```

GitHub Actions runs Docker E2E via `.github/ci/ai/compose.yml`.

Contract tests register temporary test routes to exercise validation, failures,
interception, and streaming. Those routes are never part of the application.
