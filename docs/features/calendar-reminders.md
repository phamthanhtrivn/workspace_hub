# Calendar reminders

| Method | Calendar bell | Foreground toast | App sound | Registered device push | Email |
| --- | --- | --- | --- | --- | --- |
| ALERT | Yes | No | No | No | No |
| PUSH | Yes | Yes | Unless muted | With permission/subscription | No |
| EMAIL | No | No | No | No | Yes |

ALERT and PUSH share one bell notification per event occurrence, start time, reminder time and recipient. Each live PUSH is announced once in the focused tab. Browser/system notification sounds follow device settings. The app uses the existing notification sound and mute preference; autoplay restrictions do not prevent the toast.

The editor rejects duplicate method/offset pairs, including equivalent custom units. Saving unchanged reminders retains their IDs and delivery state. Newly configured past offsets are stored as cancelled and are not backfilled. Rescheduling resets retained reminders only for the new schedule; service downtime does not cancel already pending reminders.

## Deployment

Apply Notification Service migrations and deploy its consumer before deploying Calendar Service and the frontend. Both new Kafka context and grouping fields are optional for legacy messages. Existing bell history is not merged or replayed.

Pause the Calendar reminder dispatcher while applying the Calendar data migration so an old worker cannot publish duplicate rows as they are being consolidated. Resume it with the updated Calendar Service.

From each service directory, generate Prisma Client after stopping any local process that holds the Windows Prisma DLL, then apply migrations to the intended environment:

```powershell
npm.cmd run prisma:generate
node node_modules/prisma/build/index.js migrate deploy
```

Email requires `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, optionally `MAIL_FROM`, and `FRONTEND_URL`. No real email is sent by the tests. Times use series/calendar timezone, with explicitly labeled UTC for legacy context. Templates include HTML and plain text and escape user content.

## Delivery records and limitations

Calendar `DISPATCHED` means published to Kafka, not confirmed in a recipient's inbox. Device push claims are persisted before provider delivery and use best-effort, at-most-once attempts; a crash or provider failure can lose a push rather than replay it.

Email receipts are unique per reminder group and recipient. `SENT` means SMTP accepted the message, not that the recipient read or received it in their inbox. Definite SMTP failures have at most three attempts via Kafka retry. Missing email addresses are `SKIPPED`. Ambiguous SMTP outcomes and expired in-flight claims are `UNKNOWN` and must not be automatically resent. Inspect status, attempts and timestamps in `reminder_email_deliveries` and correlate receipt IDs in service logs before any manual action. Do not bulk-reset these states.

## Verification

```powershell
# backend/calendar-service
npm.cmd run test:reminders
npm.cmd run test:calendar-policy

# backend/notification-service
npm.cmd run test:reminders

# frontend/web
npm.cmd run test:calendar-policy
npm.cmd run typecheck
```

Notification integration tests also run concurrency and SMTP outcome scenarios when `REMINDER_TEST_DATABASE_URL` points to a migrated, isolated database named `reminder_verification`. They mock SMTP and device delivery while using real PostgreSQL claims/transactions. Never point verification at an application database.
