# Calendar Task Completion

## Goal
Add a persistent, reversible completion state for Calendar-owned tasks while leaving regular events unchanged.

## Tasks
- [x] Add nullable `completedAt` storage and preserve `TASK` across recurring occurrences.
- [x] Add a task-completion API that updates only the selected occurrence.
- [x] Connect frontend API/query actions and localized feedback.
- [x] Render open/completed task states and add the detail-modal action.
- [x] Add backend and frontend regression tests.
- [x] Apply the migration and run focused builds, tests, lint, and type checks.

## Done When
- [x] A task can be marked complete and incomplete, remains visible with Google-style completed treatment, and recurring changes affect only the selected occurrence.
