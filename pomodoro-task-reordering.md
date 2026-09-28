# Pomodoro task reordering

## Goal
Allow users to reorder today's Pomodoro Calendar tasks across devices without changing event times.

## Tasks
- [x] Add nullable `task_order` to Calendar events with a safe migration.
- [x] Add a validated, authorized batch reorder endpoint and backend tests.
- [x] Expose task order through frontend types/API and sort today's tasks consistently.
- [x] Add pointer, touch, and keyboard reordering with optimistic rollback.
- [x] Add component and utility tests for ordering and persistence calls.
- [x] Run backend/frontend lint, tests, schema generation, and diff checks.

## Done When
- [x] Reordered tasks keep their order after refresh on another device.
- [x] Calendar event times remain unchanged.
- [x] Drag handles work with pointer, touch, and keyboard arrows.
