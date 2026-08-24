# Project Service Refactor Plan

## Goal

Refactor `backend/project-service` toward a pragmatic Clean Architecture while preserving every public HTTP route, request/response shape, and the existing database contract. External service communication must pass through explicit gateways with consistent configuration, timeouts, validation, and failure handling.

## Contract invariants

- Keep controller paths, HTTP methods, status codes, Vietnamese response messages, and `ApiResponse` envelope unchanged.
- Keep existing table/column names and stored enum strings unchanged.
- Keep user identity supplied by the gateway through `X-User-Id`.
- Keep notification delivery best-effort; a notification outage must not roll back a completed domain mutation.
- Keep terminal tasks (`DONE`, `CANCELLED`) read-only.

## Audit findings

- `TaskService` mixes policies, persistence, activity history, assignee management, and remote notifications. Assignee validation currently happens after the main task update, so a failed request can partially persist changes.
- Activity records are generally written outside the business transaction, allowing data and audit history to diverge.
- User/notification calls use raw `fetch`, inconsistent internal-key environment variables, no timeout, and unchecked JSON response casts.
- Invitation acceptance reads stale state before entering its transaction; concurrent responses can race. Expiration scanning performs sequential updates.
- Project template creation is large, hardcoded, sequential, and not atomic with project creation.
- Task access/edit checks and date-range checks are duplicated across services.
- Dependency creation prevents self-links but not indirect cycles.
- Duplicate migration version `V4` makes ordered migration tooling ambiguous.
- Docker Compose runs `prisma db push --accept-data-loss`, contradicting the documented SQL-migration ownership model.
- Demo SQL and Dockerfile comments contain mojibake.
- Existing automated coverage is only six tests, concentrated on mapping and terminal-state policy.

## Work groups

1. Baseline and architecture
   - Record baseline test, lint, typecheck, and Prisma validation results.
   - Define application/domain/infrastructure boundaries without adding repository interfaces for simple Prisma CRUD.

2. Communication infrastructure
   - Add typed runtime configuration and a reusable JSON HTTP client with timeout.
   - Add user-profile and notification gateways.
   - Retain current service facades where useful so domain services remain easy to migrate group by group.

3. Shared domain policies
   - Extract date-range and task-context/edit policies.
   - Allow activity recording through a Prisma transaction client and compare normalized values.

4. Task aggregate
   - Validate all input before mutation.
   - Commit task, assignee, checklist/label/dependency changes and activity history atomically where applicable.
   - Publish notifications only after commit.

5. Project, member, invitation, and sprint flows
   - Extract template construction and make project initialization atomic.
   - Make invitation transitions transaction-safe and expiration updates set-based.
   - Normalize Prisma conflict handling and sprint state transitions.

6. Database and runtime consistency
   - Resolve duplicate migration numbering without changing SQL semantics.
   - Remove destructive schema push from the container startup path.
   - Document the migration command/order expected by deployments.

7. Regression coverage and verification
   - Add unit tests for extracted policies, communication behavior, transaction boundaries, and concurrency-sensitive rules.
   - Run Prisma validation, TypeScript typecheck, ESLint, Jest, build, and a local smoke check where infrastructure is available.

## Definition of done

- All contract invariants remain true.
- No business mutation can return an error after partially saving another part of the same aggregate.
- Remote calls have bounded duration and centralized error semantics.
- The full validation suite passes, and remaining risks are documented with exact file references.
