# Meeting business audit

Audit date: 2026-11-08 (Asia/Bangkok). Verification uses code, HTTP APIs and Socket.IO; no browser was opened. All 11 reproduced findings have now been fixed and verified. The user confirmed that departed hosts must rejoin before moderation and only invited accounts may respond to invitations.

## Final results

| Verification | Pass | Fail | Total |
| --- | ---: | ---: | ---: |
| Isolated business integration suite | 58 | 0 | 58 |
| Retained frontend schedule and existing error/lifecycle tests | 15 | 0 | 15 |
| Total | 73 | 0 | 73 |

Communication Service build, AI API typecheck and frontend typecheck passed. ESLint passed with zero warnings on the changed Communication application files and the frontend schedule schema. Configuration loading and formatting rules were verified for all six backend JS/TS packages and frontend web. Whole-package lint still reports legacy issues; see the lint section below.

The integration suite passed after the fixes, including Prisma conditional updates for in-flight message writes, notification delivery to a kicked participant, and room-end delivery after participant rows change to LEFT. Four additional edge cases cover invitation replay, tied-timestamp cursor boundaries, room-end sockets and download-only revocation while signing.

| Fixed finding | Change / regression evidence |
| --- | --- |
| M-01 | Current membership is checked for meeting-room broadcasts; a removed user only receives their own departure control event. SOCKET-01/02/03 pass. |
| M-02 | Recheck recording access and download permission after awaiting signing. RECORDING-06/13 pass; revoked access returns the existing 404 contract. |
| M-03 | Cursor points to the last returned record; timestamp ties use ID ordering. CHAT-05/06 pass for older/newer/around paging. |
| M-04 | Screen-share claim condition includes LIVE meeting and JOINED participant. RACE-01 passes. |
| M-05 | Conditional Prisma updates and permission checks execute within the message transaction. RACE-02 passes. No raw SQL was introduced in the application fixes. |
| M-06 | Recheck an idempotency key within the serialized start transaction. RECORDING-02/09 pass. |
| M-07 | Delete the newly created media room if the meeting transaction rolls back. INSTANT-04 passes. |
| M-08 | Reject a request containing both channel and direct-conversation context. INSTANT-02 passes. |
| M-09 | Meeting create schema rejects a past clock time on the current day. FRONTEND-08 passes. |
| M-10 | Require an existing invitation and condition the response on valid invitation state. SCHEDULE-03/08 pass, including joined/removed replay refusal. |
| M-11 | Moderator operations require JOINED status, including the host. ROLE-03 passes. |

## Original baseline results

| Verification | Pass | Fail | Total |
| --- | ---: | ---: | ---: |
| Isolated business integration suite | 44 | 10 | 54 |
| Frontend logic and existing error/lifecycle suite | 19 | 1 | 20 |
| Total | 63 | 11 | 74 |

Four frontend/error cases are existing shared API/task error-policy tests imported by `meeting-business-errors.test.mjs`; they are included in both runner totals, not claimed as new Meeting coverage. There were no cancelled or skipped tests in the enabled runs. The original failures below are preserved as historical evidence. The retained suites now exit 0; the permission-revoke assertion uses the established 404 contract, while download-only revocation uses 403.

## Reproduce

Requires installed dependencies in Communication Service, AI API and frontend, and Docker Desktop. The harness reuses the local images of `wh_postgres`, `wh_redis`, `wh_kafka`; it does not pull images or change those containers.

From the repository root in PowerShell:

```powershell
Push-Location backend/communication-service
npm run build
Pop-Location
Push-Location backend/ai-service/api
npm run build
Pop-Location
node --test backend/security-tests/meeting-frontend.test.mjs backend/security-tests/meeting-business-errors.test.mjs
$env:WORKSPACEHUB_MEETING_INTEGRATION = '1'
try {
  node --test --test-concurrency=1 backend/security-tests/meeting-business.integration.test.mjs
} finally {
  Remove-Item Env:WORKSPACEHUB_MEETING_INTEGRATION
}
```

The integration suite is deliberately opt-in. Build first because the harness loads production `dist` modules. Communication and AI builds passed before the recorded run. Each enabled integration run creates and migrates fresh Communication/AI databases in its own PostgreSQL container. Random JWT/service keys, users, sessions and dynamic loopback ports are scoped to that run.

## Environment and limits

| Component | Exercised implementation |
| --- | --- |
| HTTP | Actual Meeting controllers, DTO validation, JWT/session guards, response interceptor and exception filter in an isolated Nest application |
| Persistence | Actual Prisma services and SQL transactions against migrated PostgreSQL; actual AI PostgreSQL tables |
| Redis | Isolated Redis for socket adapter, session fixtures and BullMQ |
| Kafka | Actual meeting invitation publisher and a real consumer; invitation delivery/deduplication checked |
| Socket.IO | Actual gateway handlers, session middleware and emitter with a real Redis adapter and real clients |
| Recording | Actual recording service, requests, jobs and worker; controlled `tick()` rather than a background polling timer |
| AI summary | Actual internal Nest API, BullMQ queue/worker, processor, authorization, checkpoints, model quota and persistence |
| LiveKit/Egress | HTTP fake accepting SDK requests and verifying signed SDK JWTs; signed webhook validation uses the actual receiver |
| Object storage | In-memory objects and an HTTP signing/download fake behind the storage boundary |
| Captions, speech, LLM | Local HTTP providers validating test credentials and returning deterministic content/outages |
| FFmpeg | Decoder fixture only; FFmpeg was unavailable on this host. Actual source authorization/download/size checks and subsequent pipeline stages run |
| User Service | Real JWT guard, with a fake session-authority endpoint backed by isolated Redis; no full User Service login flow |
| Channel/DM publication | Real transactional meeting chat-card persistence; publisher trace at the boundary, not full chat Kafka delivery |

No cloud service is called. Harness `fetch` rejects destinations outside the owned loopback endpoints. Source host, database identity and Docker labels are checked before migrations. Fixtures and failed-case state are confined to the isolated environment.

Fresh signed login tokens in persistence tests use the same seeded active session. They prove reuse across authenticated requests without client memory; they do not simulate a day elapsing or restart the full deployment.

## Original baseline coverage matrix

Pass means the named assertions passed within the boundaries above. Fail means a desired assertion reproduced an unexpected behavior. Blocked means a dependency prevented execution. Not verified means the scenario was outside this code/API run or requires another environment.

| Business area | Cases | Result |
| --- | --- | --- |
| Environment, migrations, instant create and signed identity | ENV-01, AUTH-01 | Pass |
| Schedule validation, invitations via Kafka, update/cancel, concurrent start, accepted upcoming list, timezone offsets | SCHEDULE-01/02/04/05/06/07 | Pass |
| Invitation response by an account never invited | SCHEDULE-03 | Fail; policy decision pending |
| Channel/DM membership, card persistence, media provider outage | INSTANT-01/03 | Pass |
| Ambiguous context and rollback compensation | INSTANT-02/04 | Fail |
| Password, waiting room, explicit approval, bulk admission | ADMISSION-01/02 | Pass |
| Role authorization, host transfer, kick, readmission and revoked recording grants | ROLE-01/02 | Pass |
| Management by host who already left | ROLE-03 | Fail; policy decision pending |
| Hands, personal audio/pin, notification preference | PREFERENCES-01 | Pass |
| Concurrent screen claims, interruption, leave cleanup and terminal room restrictions | SCREEN-01, LIFECYCLE-01 | Pass |
| Message ownership/edit/recall, disabled chat, attachments, unread/read and reaction toggle | CHAT-01/02/03/04 | Pass |
| Complete cursor paging | CHAT-05 | Fail |
| Personal history persistence, terminal-only hide, atomic bulk confirmation and scoped undo | HISTORY-01/02 | Pass |
| Recording requests, expiry, decision authorization, queue worker and signed completion, stale egress, pause/resume enqueue | RECORDING-01/03/04 | Pass |
| Sequential idempotency, stop job, attendee share cutoff, persistent ownership, auto-record and global capacity | RECORDING-09/10/11/12 | Pass |
| Recording view/download/rename/revoke/delete, object removal, malformed layout and provider outage | RECORDING-05/07/08 | Pass |
| Concurrent idempotency and revoke during signing | RECORDING-02/06 | Fail |
| Authorized socket join/delivery, outsider refusal, kick eviction and room reactions | SOCKET-01, REACTION-01 | Pass |
| Private delivery through stale socket membership | SOCKET-02 | Fail |
| In-flight screen share and message send racing with room end | RACE-01/02 | Fail |
| Calendar key/owner validation, revision replay, stale update, cancel/restore | CALENDAR-01 | Pass |
| Captions membership/connectivity, availability, capacity/outage, release | CAPTIONS-01 | Pass |
| Signed webhook tampering and duplicate room completion | WEBHOOK-01 | Pass |
| Summary owner-only start, viewer read, revoke while waiting, disabled/unavailable service | SUMMARY-01/02 | Pass |
| AI persistence, concurrent deduplication, replay, checkpoint retry, worker readiness, deletion during processing | AI-01/02/03/04 | Pass |
| Form basics/password edit, join-link parser, caption validation/order, duration, overview labels, message replay | FRONTEND-01 through FRONTEND-07 | Pass |
| Same-day past schedule validation | FRONTEND-08 | Fail |
| Existing error handling, request cancellation, query cleanup, listener cleanup and room lifecycle | meeting-business-errors.test.mjs | Pass |
| Real audio decode/transcoding | FFmpeg | Blocked |
| Visual layout, focus, keyboard, responsive behavior, clipboard, device permission dialogs | Browser prohibited for this audit | Not verified |
| Real media transport/audio/video quality, screen capture, recording mux/merge quality | Fake LiveKit/Egress/decoder | Not verified |
| Real S3 upload signing/policy enforcement, multipart backup recovery | Storage boundary fake | Not verified |
| Multiple socket server nodes, process crash/restart, Redis/Kafka network outages and long-duration load | Single local harness | Not verified |
| Full Calendar/User/Notification service workflows, email/reminder delivery | Service boundaries only | Not verified |

## Original findings and reproduction

These observations and source line numbers describe the pre-fix baseline, not the current line positions. Priorities are proposed triage: P1 is a privacy risk under its stated prerequisite; P2 affects behavior, consistency or validation. Both policy decisions were subsequently confirmed by the user and implemented.

| ID / proposed priority | Reproduction and observed evidence | Expected behavior / source |
| --- | --- | --- |
| M-01 P1 — stale socket membership | SOCKET-02 joins a valid user socket to a meeting, marks the participant REMOVED directly in PostgreSQL to model a missed distributed eviction, then sends a new private message. The removed user still receives it. Ordinary kick eviction passes separately. | Recheck meeting membership when emitting private data. The callback checks channel/conversation context but not meeting context: `backend/communication-service/src/modules/socket/services/socket-event-emitter.ts:28`. No claim that every normal kick leaks data. |
| M-02 P2 — fresh playback URL after revoke | RECORDING-06 holds the signing provider, removes the viewer permission through the owner API, then releases signing. Playback request returns 200 and a fresh URL. | Recheck access after awaiting signing, before returning. `backend/communication-service/src/modules/meeting/services/meeting-recording.service.ts:718`. Already-issued URL expiry/revocation is a separate storage policy. |
| M-03 P2 — skipped chat page boundary | CHAT-05 inserts 5 distinct messages, reads `limit=2` pages until no next cursor. Only 4 messages are returned. | Each message appears once. `getMessagesPage` pops the extra record and uses that record as the cursor while the next request also skips it: `backend/communication-service/src/modules/meeting/services/meeting-message.service.ts:442` and `:450`. |
| M-04 P2 — sharing restored after end | RACE-01 pauses after member authorization, ends the meeting through the host API, then resumes screen-share start. It returns 201 and writes a non-null sharer onto an ENDED meeting. | Atomically preserve terminal state and current participant eligibility. The update filters the previous sharer but not LIVE status: `backend/communication-service/src/modules/meeting/services/meeting-screen-share.service.ts:92`. |
| M-05 P2 — message committed after end | RACE-02 pauses after member authorization, ends the room, then resumes send. API returns 201 and one new message is inserted after end. | Revalidate current meeting/participant state in the write transaction. Authorization precedes a separate transaction: `backend/communication-service/src/modules/meeting/services/meeting-message.service.ts:109` and `:141`. |
| M-06 P2 — concurrent idempotency conflict | RECORDING-02 holds both ListEgress calls so two starts with the same key both pass the initial replay lookup. On release, responses are [202,409], although sequential replay passes. | Both requests return the same recording; a reused key with changed payload remains 409. Initial replay lookup is outside the meeting lock; the second transaction hits the active-recording check: `backend/communication-service/src/modules/meeting/services/meeting-recording.service.ts:155` and `:222`. |
| M-07 P2 — orphan media room on rollback | INSTANT-04 lets the real meeting INSERT transaction run, injects a throw before commit, verifies the SQL record rolled back, and observes one extra media room remaining. | Compensate the external room creation if persistence fails. CreateRoom precedes the transaction without rollback cleanup: `backend/communication-service/src/modules/meeting/services/meeting-room.service.ts:145` and `:156`. |
| M-08 P2 — ambiguous channel/direct context | INSTANT-02 posts both a valid channelId and conversationId. API returns 201 and stores both. Context access/card branches select the channel first. | Reject a request with two contexts at the boundary. `backend/communication-service/src/modules/meeting/services/meeting-room.service.ts:96` and `:189`; `dto/create-instant-meeting.dto.ts`. This audit did not establish a concrete cross-context data leak. |
| M-09 P2 — frontend accepts an earlier time today | FRONTEND-08 freezes the local clock at noon, submits a start one hour earlier with a valid future end, and schema validation succeeds. SCHEDULE-01 confirms the API rejects past starts. | The form should reject the same past clock time as the API. Shared validation compares only date prefixes: `frontend/web/lib/date-range.ts:46`, called by `frontend/web/features/meeting/schemas/schedule-meeting.schema.ts:23`. |
| M-10 policy — invitation self-enrollment | SCHEDULE-03 creates a scheduled meeting inviting member/other. An outsider posts invitations/accept and gets 201 with a new APPROVED participant row instead of a refusal. | Proposed: require an existing invitation and preserve unrelated participant states. `backend/communication-service/src/modules/meeting/services/meeting-schedule.service.ts:476` and `:505`. This alone does not prove bypass of a password or waiting-room approval. |
| M-11 policy — moderator access after leaving | ROLE-03 has the host leave, then PATCH settings. Response is 200 and chatEnabled changes. Other joined-only APIs deny departed participants. | Proposed: require JOINED for host moderator operations. The hostId branch bypasses participant status: `backend/communication-service/src/modules/meeting/services/meeting-policy.service.ts:44`. Confirm whether remote host management is intended. |

Race probes pause an existing service boundary and then use real HTTP operations and real SQL; production code is not replaced with a synthetic implementation. Provider holds are released in `finally`. Permission and terminal-state failures were reproduced across repeated integration runs. The recording concurrency probe explicitly synchronizes the two preflight calls.

## Cleanup

Every enabled integration run completed its teardown, including runs with failing assertions. The last run printed both:

```text
Removed security-test processes, containers, network and anonymous test volumes.
Meeting audit cleanup verified: no test containers, network or scratch directory remain.
```

Owned clients, Nest servers, socket clients/server, Kafka consumer/producer, BullMQ worker/queues and database connections were closed. AI pipeline scratch directories were checked for ENOENT. Docker containers/network are removed using the run label; the temporary audit directory is removed only after checking that its resolved path is inside the OS temporary directory with the expected prefix. Existing application containers and private env files were not changed.

The user chose to retain necessary regression tests. Five newly added pure-helper frontend tests (FRONTEND-03 through FRONTEND-07) were removed after the audit; schedule regressions, business flows and required harness modules remain. Existing tests remain untouched. No temporary verification scripts or log files were added. Temporary npm caches used to install lint tooling were also removed.

## ESLint across backend and frontend

All six backend JS/TS packages (Communication, Calendar, Document, Project, Notification and AI API) and frontend web now enable Prettier through ESLint, with 80-column wrapping, two-space indentation, trailing commas and a blank line before return statements. Existing quote conventions are retained: single quotes in the five Nest services, double quotes in AI API and frontend web. All packages expose `npm run lint:check` and `npm run lint:fix`. Existing framework and security rules are retained. Java User Service, Python workers and Lua Kong configuration are outside ESLint's language support.

AI API and frontend receive their own missing dev dependencies and lockfile entries. Previously locked dependency versions were checked and did not change. The rules were exercised with each package's own installed ESLint, using `--print-config` and a read-only full-package scan. Formatting was applied to the files changed for this task; the scan also identifies older files that do not yet meet the new formatting standard.

| Package | Files scanned | Errors | Warnings |
| --- | ---: | ---: | ---: |
| Communication | 254 | 388 | 6 |
| Calendar | 104 | 167 | 3 |
| Document | 77 | 214 | 0 |
| Project | 150 | 1234 | 0 |
| Notification | 46 | 572 | 0 |
| AI API | 110 | 179 | 0 |
| Frontend web | 1007 | 15464 | 80 |

These are whole-package findings, not failures of the Meeting regression suite. Most are formatting/blank-line findings in existing files; other existing findings include unsafe types, unused variables and missing awaits. Whole-repository lint is therefore **not green**. The changed Meeting files pass targeted ESLint. No unrelated business files were rewritten just to clear the legacy lint inventory.

Proposed single commit message: `fix(meetings): resolve audit findings and standardize lint formatting`

No git commit has been created.
