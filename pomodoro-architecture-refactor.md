# Pomodoro architecture refactor

## Goal

Keep the current Pomodoro UI and user-facing behavior while making the feature resilient to Calendar API outages, cheaper to render, and easier to maintain.

## Tasks

- [x] Add regression tests for offline initialization and failed state synchronization.
- [x] Add versioned local persistence for Pomodoro config and timer state.
- [x] Refactor timer hydration to use server data when available and local/default data otherwise.
- [x] Make failed server writes non-blocking and retry synchronization automatically.
- [x] Remove unused fullscreen/sound APIs, stale timer-display props, and the dead task-picker dialog.
- [x] Stabilize view callbacks and memoize timer-independent subtrees.
- [x] Separate Calendar task fetching/reordering/deletion from the active-task UI.
- [x] Run focused tests, full Pomodoro tests, lint, typecheck, and production build.

## Acceptance criteria

- The timer is usable when Calendar config or timer-state endpoints return an error.
- A failed timer-state write does not pause or disable the timer.
- Local state survives a reload and is synchronized after the backend becomes available.
- Existing Pomodoro UI and interaction flows remain unchanged.
- Timer ticks do not re-render task, ambient-player, stats, or history components unnecessarily.
- No dead Pomodoro picker/fullscreen/legacy sound-toggle code remains.
- Tests, lint, typecheck, and build pass.
