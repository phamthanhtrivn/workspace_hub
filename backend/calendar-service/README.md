# Calendar Service

NestJS + Prisma service for WorkspaceHub calendars, events, attendees, recurring occurrences, reminders, and task projections.

## Capabilities

- Stores recurring events as queryable occurrences and supports `THIS`, `THIS_AND_FOLLOWING`, and `ALL` update/cancel scopes.
- Dispatches due reminders to `calendar-reminder-events`; Notification Service delivers `ALERT`, `PUSH`, or `EMAIL`.
- Enforces private/public visibility and returns per-user event permissions.
- Verifies document access through Document Service; project-task fields remain snapshots, not a live Project authorization integration.
- Keeps read-only project-task presentation fields for a future integration, but does not currently consume Project events.
- Validates date/UUID filters and paginates event range queries.
- Owns Pomodoro preferences, completed sessions, daily statistics, and optional cross-device timer state.

## Calendar Pomodoro API

All routes use the `/api/calendar/pomodoro` prefix and the authenticated `x-user-id` supplied by the gateway. Responses use the Calendar service `{ success, message, data }` envelope.

| Method | Path | Purpose |
| --- | --- | --- |
| GET / PUT | `/config` | Read defaults or save the full Pomodoro preferences object. |
| GET / PUT | `/ambient-preferences` | Read or save `{ trackId, volume, autoPlayOnFocus }` independently of timer settings. Volume is 0–1; track IDs are built-in IDs or `custom_` IDs (maximum 128 characters). Uploaded files remain browser-local. |
| GET / PUT / DELETE | `/state` | Read, save, or clear the current timer snapshot. PUT requires `expectedVersion` (`0` creates); DELETE requires it in the JSON body. Clearing returns an `IDLE` snapshot with an incremented version, so old devices cannot overwrite a new timer. A stale version returns 409. |
| POST | `/sessions` | Save a completed, stopped, or skipped session. Send a stable `clientSessionId` on retries to prevent duplicates. |
| GET | `/sessions` | Query a UTC time range with `startAt`, `endAt`, optional `eventId`/`taskId`, `page`, and `limit`. Maximum range: 93 days. `summary` covers all matches, independent of pagination. |
| GET | `/sessions/today` | Retrieve today's sessions in the requested `timeZone`. |
| GET | `/stats/daily` | Retrieve daily totals, goal, task count, interruptions, and streak. Accepts `date=YYYY-MM-DD` and `timeZone`. |

Session POST requires `sessionType`, `status`, ISO `startedAt`/`endedAt`, `plannedSeconds`, and `actualSeconds`. `eventId` and `taskId` are optional. An event must belong to the caller's calendar. The response also includes `durationMinutes` for the existing Pomodoro history UI. Task and project titles are optional snapshots; their IDs are not foreign keys to Project DB.

Daily endpoints use `Asia/Ho_Chi_Minh` by default. Pass an IANA `timeZone` to use the viewer's calendar zone. Session timestamps remain stored as UTC instants.

The current Pomodoro page still uses browser storage and `/api/pomodoros` points at Project service. Its API client must be adapted to these Calendar routes before that page will synchronize with Calendar. The Calendar event detail uses these routes directly.

## Local configuration

Keep the existing private .env with localhost infrastructure/service URLs. Apply reviewed migrations explicitly:

```sh
npm ci
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Calendar runs on the host at port 8086, backed by calendar_db. Kong forwards public calls. USER_SERVICE_URL and DOCUMENT_SERVICE_URL override localhost defaults in every environment. See [local setup](../../docs/local-development.md).

Document attachments use `POST /internal/document-access/resolve` with the actor and up to 50 distinct document IDs per batch. Set a dedicated `CALENDAR_DOCUMENT_SERVICE_KEY` (at least 32 random characters) in both Calendar and Document Service. The receiver still checks resource permissions, archived state and file type. No public fallback, permission cache or automatic retry; missing/mismatched credentials fail closed with 503 at Calendar. From repository root, `node backend/scripts/configure-ai-security.mjs --apply` provisions existing local env files without changing legacy credentials. See `security.env.example`; restart both services after configuration changes.

## Kafka topics

- consumes: `user-profile-events`
- produces: `calendar-reminder-events`
