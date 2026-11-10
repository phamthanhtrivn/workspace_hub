# Notifications and task archive removal

## Confirmed scope

- Project invitation responses notify the actual inviter with responder, project, result and timestamps.
- Keep the existing pending invitation list; always show Invitations for members who can invite.
- Personal direct file/folder shares and permission changes notify the recipient. Exclude chat sharing, project documents, inherited children and unchanged grants.
- Task changes notify the current assignee, creator and project owner, excluding the actor and duplicate recipients. Task comment events also notify participating comment authors who still belong to the project.
- Reassignment notifies the removed assignee once. Later changes use current membership and assignment.
- Member permission changes include before/after values. Removed project members receive a notification; linked space General receives a system message.
- Notification list/filter changes are silent. Fix input borders and icon stacking using existing light/dark tokens.
- Remove the task archive feature at the user's request: frontend controls, filters, contracts, backend endpoints/services and the `Task.archived` database field.
- Preserve task soft deletion via `deletedAt`, task status rules, notifications, and project/document archive features.

## Implementation and verification

- [x] Notification contracts, transactional delivery intents and local database migrations.
- [x] Notification renderers, document deep links and event-based sound alerts.
- [x] Remove task archive controls, filters, endpoints, services and schema field; replace remaining task visibility checks with soft-delete checks.
- [x] Apply the task archive removal migration locally and regenerate Prisma client. All 12 existing task records remain.
- [x] Complete 36 project-service tests and 29 frontend regression tests after removing task archive. Backend TypeScript, Prisma validation, frontend production build and targeted lint pass. Existing files are linted without formatting-only rules; the new deletion regression spec passes full lint.
- [x] Provide UI verification steps below. The user will verify the UI; do not open Chrome.

## UI verification

1. In Project task views and Task detail, verify that Archive/Restore controls and the Active/Archived filter are absent. Check board, list, calendar, Gantt, summary, members and Pomodoro task lists.
2. Verify existing task edit permissions, closed-task read-only behavior and task status transitions. Project and document archive features remain available.
3. Test project invitations with two accounts, accept/decline, permission changes, reassignment, comments, and member removal. Check recipients and task deep links. Check the default General channel system message when the project has a linked space.
4. Share a personal file/folder directly with another account, change its permission and repeat the same grant. Only new or changed direct grants should notify. Chat sharing, project documents and inherited children should not create these document notifications.
5. Switch Bell categories and read/date/page filters without receiving a new event; no sound should play. Verify search/clear/send/password/loading icons and input borders in both light and dark modes.

## Follow-up: push diagnostics and share notification synchronization

- Resolve duplicate email snapshots by latest `syncedAt` when creating personal shares. Diagnose recipient identity against User Service, rather than assuming a cached snapshot still represents the current account.
- Refresh the global unread count on focus, visibility changes, reconnection and a visible-tab fallback interval; fetching an unfiltered notification snapshot also repairs the badge.
- Keep date-filtered unread counts separate from the global badge. Refreshing existing notifications stays silent.
- Report the failing Web Push setup step, HTTP status, backend reason and provider hostname, without logging subscription tokens or encryption keys. Keep the existing push endpoint allowlist unchanged.

## Local database

The personal sharing investigation found a deleted account's profile snapshot with
the same email as a newer account. An unordered email lookup bound shares and
notifications to that deleted ID. The sharing lookup now prefers the latest
snapshot, and an explicit owner re-share to a different resolved account emits a
new sharing notification even if permission is unchanged. Read access continues
to use the bound user ID; it does not transfer existing grants by email.

After checking the affected old ID was absent from User Service and the current
recipient matched the confirmed email, repaired one confirmed personal-file grant
and its 12 saved sharing notifications in the local database. Other documents and
notification types were left outside this repair.

Applied `20261110000100_project_document_notifications` to notification-service and `20261110000100_document_notification_outbox` to document-service. Deploy these migrations in any other environment before running the updated services.

Applied `20261110000200_remove_task_archive` to project-service using `prisma db execute` and recorded it using `prisma migrate resolve --applied`. The existing database has three older pending Prisma migrations; these were not applied or marked as applied as part of this change. The equivalent legacy SQL migration is `database/migrations/V28__remove_task_archive.sql`; use the migration mechanism for the target environment.

Verified that `tasks.archived` is absent, `tasks.deleted_at` and `projects.archived` remain, and all 12 task records are readable. Restart project-service after pulling this change so its running Prisma client matches the schema. Frontend development reloads automatically; rebuild/restart the frontend for production.
