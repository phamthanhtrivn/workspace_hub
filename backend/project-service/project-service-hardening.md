# Project Service Hardening

## Goal
Close the reviewed authentication, deployment, migration, concurrency, and input-integrity gaps without changing existing routes or response envelopes.

## Tasks
- [x] Verify JWT identity inside Project Service and restrict CORS origins.
- [x] Separate standalone and full-stack Compose definitions; expose Project Service only inside the stack network.
- [x] Reset migration numbering, standardize `TIMESTAMPTZ`, and align Prisma constraints with SQL.
- [x] Convert member, label, and sprint race failures into deterministic conflicts.
- [x] Activate optimistic locking for mutable versioned records touched by the reviewed flows.
- [x] Trim validated names and titles before non-empty checks.
- [x] Persist project notifications and invitation emails through a transactional outbox with retries.
- [x] Add compatible pagination metadata to project, task, comment, and activity lists.
- [x] Add public liveness/readiness endpoints and a non-root multi-stage production image.
- [x] Remove committed runtime logs and ignore future log files.
- [x] Add unit and PostgreSQL integration coverage for the reviewed race and rollback paths.
- [x] Run Jest, integration tests, ESLint, TypeScript, Prisma, Compose, migration, image-build, and runtime checks.

## Done When
- [x] Spoofed or mismatched identity headers are rejected even when port 8082 is called directly.
- [x] Concurrent writes do not leak Prisma constraint errors as HTTP 500 responses.
- [x] Notifications survive process interruption after the business transaction commits.
- [x] Project Service passes all automated and production-container checks.

## Notes
- Keep all current API paths and response envelopes.
- Full-stack traffic continues through Kong; the service independently validates the same HS256 token as defense in depth.
- Migration history is intentionally reset because existing Project Service data was declared disposable.
