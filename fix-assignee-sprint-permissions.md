# Fix assignee and sprint permissions

## Goal
Align frontend permission gates with the backend policy for assignee checklists, sprint task movement, and task creation inside planned sprints.

## Tasks
- [x] Split checklist rejection from full task-edit rejection. Verify: an assignee can call all checklist actions while terminal tasks remain blocked.
- [x] Gate backlog/sprint task movement with `canManageSprints`. Verify: sprint managers can drag tasks and non-managers cannot.
- [x] Remove `canManageSprints` from planned-sprint quick creation. Verify: `canCreateTask` alone exposes the action.
- [x] Add focused frontend regression tests for all three permission combinations.
- [x] Run frontend lint, typecheck, and focused tests.

## Done When
- [x] Frontend permission behavior matches the existing backend authorization policy and all relevant checks pass.

## Notes
No backend policy change is required for these three fixes.
