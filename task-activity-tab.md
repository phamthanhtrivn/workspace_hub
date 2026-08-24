# Task Activity Tab

## Goal
Add a dedicated "Nhật ký" tab to the task detail drawer and record task-related checklist, label, and comment changes in the existing activity feed.

## Tasks
- [x] Add activity records to checklist, label, and comment mutations -> Verified each mutation calls `ActivityService.record` with the task and actor.
- [x] Add Chi tiết/Nhật ký navigation to `task-detail-drawer.tsx` -> Verified only the selected scroll panel is visible.
- [x] Render newest-first activity states with Vietnamese field/action labels, actor, values, loading, error, and empty states -> Verified by ESLint and TypeScript compilation.
- [x] Refresh activity data when opening Nhật ký and after mutations -> Verified the tab invokes the existing React Query refetch.
- [x] Run backend tests/type-check and frontend lint/type-check -> All commands passed.

## Done When
- [x] Project members can open Nhật ký and see up to 100 newest task changes, including task fields, checklist, label, and comment actions.
- [x] The existing Chi tiết task workflow remains unchanged.

## Notes
- Reuses `GET /api/tasks/:taskId/activities`; no schema migration is required.
- Preserves existing project permissions enforced by `ActivityService.list`.
