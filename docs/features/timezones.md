# Account timezone

WorkspaceHub stores timestamp values as UTC instants. Each signed-in user's saved `account_settings.timezone` controls date/time presentation and timed form input throughout the web workspace. The default is `Asia/Ho_Chi_Minh` (UTC+07:00); existing valid preferences are preserved. Missing or invalid preferences fall back to Vietnam. This feature does not rewrite existing timestamps or change the server/DB timezone.

## User behavior

- Open Settings → Preferences → Timezone, search by city, region, IANA name or UTC offset, select a zone and save. Unsaved selections remain a Settings draft.
- The workspace header shows a calendar icon on a soft blue tile, a divider, and left-aligned 12-hour `hh:mm AM/PM` above `DD/MM/YYYY` before Help & shortcuts. AM/PM uses smaller muted text and is included in the accessible name and tooltip; noon is `12:00 PM` and midnight is `12:00 AM`. The current UTC offset (for example, `UTC+07:00`) appears in a soft blue pill with a clock icon. Time uses the header's foreground color and the date uses muted text; blue surfaces use semantic theme tokens. Region names remain in Settings. Its clock opens Preferences. Small screens stack the time and UTC pill and hide the date and decorative icons; the complete date and UTC offset remain in its accessible name and tooltip. Other modules and timed inputs retain their existing time formats.
- Dashboard greeting, Calendar, Project/Task views, Meeting/recording dates, Chat, Notifications, Documents, notebook timestamps, Work Assistant and Pomodoro presentation use the account preference. Relative elapsed durations do not change when the timezone changes.
- Timed form values are wall-clock values in the selected account zone. Convert them to UTC before submitting. For example, 09:00 in Vietnam is 02:00 UTC; the same instant is 11:00 for a viewer using UTC+09:00.
- Birthdays, project dates, all-day task dates and all-day calendar events retain their calendar dates. Project all-day values use their date portion; Calendar all-day boundaries use the event/series/calendar's original zone. A different viewer's zone must not move them to another date.
- Today, calendar ranges, notification date filters, recording date filters and Pomodoro daily/report queries use account-zone calendar-day boundaries, converted to UTC for requests. DST days can have 23 or 25 hours.
- Recurring timed events retain their series timezone after creation. A settings change affects viewing, not recurrence generation. New series capture the creating user's account zone as internal metadata; no additional timezone selector is shown in event forms.
- Weather and its Use location control retain their existing behavior.

## Implementation

`frontend/web/lib/timezone.ts` owns validation, UTC parsing, formatting, wall-time conversion and day boundaries. Its browser-only preference store never stores a user's choice in server request state. `AccountTimezoneSync` reads the existing account-scoped React Query cache; `useAccountTimezone` subscribes to confirmed changes without issuing an extra settings request from every timestamp component. Logout/account changes fall back while the next account's settings load. Server rendering uses the fixed Vietnam default.

Use `formatInTimezone`/`formatDateTime` for timestamps, `formatDateOnly` for civil dates, and `toZonedDateTimeInput`/`fromZonedDateTimeInput` at timed editor boundaries. Supply an explicit zone in pure calculations and memoized callbacks. Do not change `Date.prototype`, browser/OS timezone or database timezone. Legacy offset-less UTC API timestamps are handled by `parseUtcDate`; local form strings use the wall-time parser instead.

Skipped wall times at a DST transition are rejected. New values in a repeated hour choose the earlier occurrence; editing an unchanged existing value preserves its original instant and seconds. Series updates preserve the series zone unless the series is moved to another calendar.

User Service validates saved preferences against Java's supported IANA zone identifiers. Calendar's optional `timeZone` DTO property records the zone when creating/converting a recurrence series. This uses existing schema fields and requires no timezone data migration.

## Verification

Behavior tests stay with their owners:

- `frontend/web/lib/timezone.spec.ts`: defaults, UTC conversion, midnight, offsets and DST.
- `frontend/web/features/user-setting/utils/timezone-options.spec.ts`: timezone search.
- `frontend/web/features/user-setting/components/ui/timezone-select.spec.cjs`: search and keyboard selection without submitting Settings.
- `frontend/web/features/calendar/calendar-policy.spec.cjs`: event form, date ranges and recurrence workflows.
- `backend/calendar-service/src/modules/calendar-event/timezone.spec.ts`: recurrence timezone validation and persistence.
- `backend/user-service/src/test/java/vn/workspacehub/user/service/AccountTimezoneTest.java`: persisted preference validation.
- `backend/project-service/src/modules/task-sync/task-sync-timezone.spec.ts`: date-only versus timed deadlines in task-card metadata.

See [test commands and layout](../../tests/README.md). Fast tests use mocks and do not read private `.env` files or alter application databases. Manual UI verification remains separate from these tests.
