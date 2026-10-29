# UX logic fixes: rollout and verification

Implementation covers Documents/Upload, Tasks/Polls, Settings, Meetings, Project access, Calendar conferences, Dashboard cache, Pomodoro timezone and Notifications. AI behavior is outside this change.

## Database and service rollout

Use the migration workflow in [deployment.md](deployment.md). Do not use `db push` against application databases. No application migration or reconciliation write was executed during implementation.

1. Apply Document migration `20261028000100_storage_lifecycle`. Deploy Document first: copies use new storage keys; quota reservation and version writes commit together; permanent deletion queues reference-checked object cleanup.
2. Apply Communication migrations `20261028000100_meeting_readmission`, `20261028000200_project_access_revision`, `20261028000300_calendar_meeting_binding`. These add readmission, access watermarks and idempotent occurrence binding, including cancellation tombstones.
3. Apply Project SQL migration `database/migrations/V24__project_access_sync_jobs.sql` with the existing SQL migration runner. Deploy Project; membership changes, project creation and renames enqueue access reconciliation. Existing projects receive jobs on worker startup. Membership reconciliation never creates a missing chat space.
4. Apply Calendar migration `20261028000100_calendar_conferences`. Set `COMMUNICATION_SERVICE_URL` and the shared `INTERNAL_SERVICE_KEY`; see `backend/calendar-service/conference.env.example`. Production Compose supplies both. Deploy Calendar and Notification before the web.
5. Deploy the web after backend readiness checks. Test with two sessions before promoting the release.

Old vote requests without `selected` remain supported. Old Calendar responses without `conference` and Project responses without `accessSync` remain readable by the new web types. The new backend never infers a conference from arbitrary location text. Legacy conference conversion uses the explicit verifier below.

Project/Calendar/Communication Prisma generation encountered a Windows engine DLL lock while existing processes were using the client. The generated client types and backend builds were verified; run a clean `prisma generate` in the release build, or after stopping the corresponding development process. Application processes were not terminated by this task.

## Data reconciliation

Run commands from their service directory. Every script defaults to a read-only report. Review reports before `--apply`; archive them outside publicly served directories.

| Service | Command | Effect of `--apply` |
| --- | --- | --- |
| Document | `node scripts/reconcile-storage.cjs --check-objects` | Recalculates retained-version usage per owner, including trash. Preserves limits and files even when usage exceeds the limit. |
| Project | `node scripts/reconcile-access.cjs` | Enqueues the latest membership snapshot for all projects; repeat runs converge safely. |
| Calendar | `node scripts/reconcile-conferences.cjs` | Adopts a legacy room only after verifying host, occurrence start and existing binding. Reports ambiguous records. |

The Calendar verifier requires the new Communication internal endpoint. It preserves physical locations. A legacy room is adopted by at most one occurrence; remaining occurrences receive independent rooms. A rerun does not replace an existing binding.

Read-only audit against the configured development data on 2026-10-29: **2 document owners, 1 quota mismatch, 2 shared object keys, 0 missing S3 objects; 13 projects**. No quota was rewritten and no shared object was deleted.

## Automated verification

Run `npx nest build` in Document, Project, Communication, Calendar and Notification. Node tests that import `dist` need this build first.

| Directory | Commands |
| --- | --- |
| `backend/document-service` | `npm run test:ux`; `npm run test:ux:postgres` |
| `backend/project-service` | `npm test`; `npm run test:ux:postgres` |
| `backend/communication-service` | `npm run test:ux`; `npm run test:ux:postgres` |
| `backend/calendar-service` | `npm test -- --runInBand`; `npm run test:ux:postgres` |
| `backend/notification-service` | `npm test` |
| `frontend/web` | `npm run test:ux`; `npm run typecheck`; `npm run build` |

The PostgreSQL commands create a random `ux_test_<uuid>` schema, push only to that isolated schema, and drop it afterward. They never reset or migrate the configured application schema. `TEST_DATABASE_URL` may override the configured database. Connections need permission to create/drop test schemas. Tests allow connection startup time and use multiple connections for real lock/concurrency verification.

Verified scenarios include independent/idempotent file imports, failed-copy cleanup, owner quota at the limit, concurrent versions, all-version deletion, legacy shared keys, mixed-owner folder deletion, task reopen concurrency, poll selection concurrency/replay, rejected poll conversion without vote loss, occurrence room replay/cancellation ordering, recurring THIS/FUTURE/ALL transactions and stable occurrence IDs, avatar draft cache behavior, report DST boundaries, Dashboard invalidation and HTTP/socket unread-count ordering.

Latest results: Project **62 unit tests**, Calendar **103**, Communication outside AI **204**, Document **8 scoped unit tests**, Notification **3**. Isolated PostgreSQL runs passed: Document **10**, Project task reopening **1**, Communication poll/meeting **3**, Calendar recurrence **5**. Web passed **7 UX tests** plus **49 regression tests**, typecheck and production build. Opt-in integration tests are skipped in ordinary unit runs and executed separately by the PostgreSQL commands.

Root-folder provisioning is serialized and rejects old access revisions, including renames. Calendar reconciliation is serialized per calendar; deleting a calendar queues room cancellation and attendee notifications in its deletion transaction. Notification list refreshes do not own the global unread badge; the global socket hook reconciles it from the server after HTTP commits and realtime events.

Regression commands also passed for frontend auth refresh, field focus, screen sharing, captions and landing rendering/motion. Communication's two chat constructor mocks were corrected. The AI suites are excluded from the scoped acceptance run. A broad discovery run also exposed existing AI-only test wiring/module resolution failures; no AI code was changed.

The production web build needs access to Google Fonts for the existing `next/font` Inter download. The build passed with network access; the restricted-network run failed at font download. A targeted lint run reported existing effect/setState patterns in legacy components; lint is not recorded as a clean pass.

## Integrated acceptance remaining

Browser inventory returned `The browser access host is unavailable`, so an authenticated browser run could not be executed in this session. Backend/database tests do not replace the following checks after migrations and startup:

- Two browser sessions: complete/reopen a task, vote/change poll mode, read/read-all notifications, disconnect/reconnect; verify lists, Dashboard and badge reconcile.
- Avatar: upload preview, Save, Discard, close Settings and failed Save; verify the header changes only after Save.
- Meeting: remove an attendee from a channel/auto-admit room; verify existing media/socket access is revoked, re-entry waits for approval, and former channel members remain blocked.
- Project: stop Chat/Document temporarily, accept invitation/add/remove/change permissions, then restore services; verify primary writes succeed and only unavailable panels are disabled.
- Calendar: retain `Library`/`Room101`, move/edit/RSVP/cancel, test THIS/FUTURE/ALL, and edit a started room; verify distinct per-occurrence links and preserved started-room schedule.
- Account timezone: cross midnight with a device in another timezone; check Dashboard and Pomodoro while a timer remains active.
- S3 integration: import a disposable personal file, verify independent project/task copy and version contents, then test trash/permanent deletion under the application's normal test workflow.

## Operations

Workers log resource IDs and revisions, failed attempts and oldest overdue delay. Watch pending/failed rows and repeated retries in `project_access_sync_jobs`, `calendar_conferences`, and `storage_cleanup_jobs`. Backoff is capped; successful state is guarded by the delivered revision. Manual retry enqueues work and does not reaccept invitations or send duplicate Calendar notifications.

Keep the additive tables and columns during application rollback. Pause old writers before performing quota reconciliation. Never delete a shared storage key by hand to resolve an audit discrepancy. Review unresolved legacy conference records rather than guessing from location text.
