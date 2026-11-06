# Local security verification

These are reusable regression tests for authentication, internal HTTP credentials,
resource permissions and asynchronous delivery. They use the installed service
dependencies and compiled application classes; no test dependency installation is
needed.

## Prepare

Install the normal dependencies of the seven services and `frontend/web`. Build the
six Node services with their own `npm run build`, including `backend/ai-service/api`.
Build the User executable JAR from `backend/user-service`:

```powershell
mvn.cmd -DskipTests package
```

Docker must be available. The suite reads the image IDs of the existing
`wh_postgres`, `wh_redis`, `wh_kafka` and `wh_kong` containers. It creates separate
containers from those images with `--pull=never`. Rebuild the local Kong image
before testing changes to its Lua plugins.

## Run from repository root

```powershell
node backend/security-tests/inventory.mjs
node backend/security-tests/inventory.mjs --json
$env:WORKSPACEHUB_SECURITY_INTEGRATION = '1'
node --test --test-reporter=spec --test-concurrency=1 backend/security-tests/security.integration.test.mjs
Remove-Item Env:WORKSPACEHUB_SECURITY_INTEGRATION
```

Without the opt-in variable, the integration suite is skipped. Do not run multiple
copies in the same Node process: the application configuration modules cache their
environment at import time.

## Isolation and cleanup

- A random run ID labels the test network and every test container. Published
  ports are selected dynamically and bound to `127.0.0.1`.
- All seven databases use the `wh_security_test_` prefix, on the newly created
  PostgreSQL container. Their real migration chains run from empty databases.
  Application database URLs and credentials are never changed.
- Redis, Kafka topics/offsets and AI queue jobs exist only inside the test stack.
  Authentication and caller secrets are randomly generated for that run.
- User HTTP runs with a test-only bucket/credential and an unreachable local mail
  endpoint. No email, LLM request, model download or real S3 object is created.
  OTP tests inspect only the isolated Redis intent.
- The gateway uses the tracked host template with the User upstream changed to
  the test API port. Other business upstreams are not exercised by this gateway
  test. Its temporary template is removed during teardown.
- Teardown closes HTTP/socket/Kafka/Prisma clients, stops the exact test JVM, and
  removes containers only after checking their run-ID label. Only anonymous test
  volumes are removed. Existing containers, volumes and private backups remain.
- On Windows the suite resolves `java.home` and starts the real JVM executable;
  killing only a launcher shim can otherwise leave the child JVM alive.

## What is exercised

| Area | Runtime checks |
|---|---|
| Before authentication | Registration, unverified email, incorrect/consumed/expired OTP, OTP purpose separation, login rate limit and invalid token claims. A real Redis outage cannot bypass the limiter or issue a login credential. |
| Sessions | Refresh rotation/reuse, isolated session families, logout, ownership/password checks for session revocation, password reset replay and revocation. |
| Identity | All five Nest identity guards call the real User session endpoint, replace forged headers and reject dependency failure; AI also requires gateway proof matching the JWT identity. |
| Internal HTTP | At least one allowed operation on every one of the 16 caller edges; other configured caller credentials, missing/invalid/legacy keys, and Communication attempting Document write authorization are rejected. |
| Business permissions | Real Project/Document/Communication/Calendar databases; revoked project membership overrides stale local grants; document shares and public ticket generations remain revocable; Calendar ownership and private chat media/recall. |
| Storage authorization | Avatar URL issuance and confirmed preview ownership; document tickets are checked before a stub storage reader is invoked. This does not validate IAM or object availability. |
| Gateway/socket | Real Kong internal-path blocking and identity forwarding; real Socket.IO handshakes, stale rooms, removed membership and revoked sessions. |
| Transactional delivery | User registration and its outbox roll back together; a real broker outage preserves committed events until acknowledgement. |
| Task/notification outboxes | Real atomic claims, expired lease recovery, stale-owner completion refusal and transaction rollback; a committed Notification HTTP response lost to the sender is safely retried with one row/effect per delivery and recipient. |
| Kafka consumer | Actual Nest Kafka transport with PostgreSQL interrupted: failed offset is not committed past, recovery retries, revision replay is idempotent, poison events are quarantined and the partition continues; readiness follows handler failure/recovery and shutdown. |

The HTTP caller matrix mounts production controllers and guards with stub business
collaborators to isolate credential dispatch. Separate business tests use the real
database and permission services. The Kafka integration currently exercises the
Project profile consumer; it does not certify every Kafka topic or consumer.

## Limits

The inventory reports static HTTP, Kafka and socket declarations with source
locations. Expressions in braces need manual resolution. A declaration classified
as `public` or `independent` still needs review of its guard/filter and operation
authorization. Inventory counts are not a coverage percentage.

These tests do not replace browser testing, Google OAuth/provider integration,
SMTP delivery, real recording/LiveKit, external S3/IAM checks or prolonged
multi-node load tests. They do not certify all inventory
routes or every allowed operation on an internal edge. Existing focused service
tests should also be run.

JWT HS256, shared runtime database credentials, and local plaintext Kafka remain
the configured architecture. SASL/TLS/ACL and asymmetric JWT verification require
a separate rollout. No production deployment is performed by this suite.
