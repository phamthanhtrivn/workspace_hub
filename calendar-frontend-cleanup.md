# Calendar Frontend Cleanup

## Goal
Refactor only the Calendar frontend so UI, state, data fetching, and domain transforms have clear ownership while preserving the current UX and API contracts.

## Tasks
- [x] Capture current Calendar behavior with focused tests for form defaults and keyboard/modal behavior.
- [x] Split workspace navigation, visibility/preferences, and event actions into focused hooks.
- [x] Move event-form initialization and submission mapping out of the modal component.
- [x] Split quick-create Event, Task, and Appointment panels into presentational components.
- [x] Move attendee search and attendee profile lookup to cached React Query hooks.
- [x] Add shared modal keyboard/focus accessibility behavior.
- [x] Remove unstable effect dependencies and avoid unnecessary Calendar rerenders.
- [x] Run Calendar tests, targeted ESLint, TypeScript, performance checks, and a production build.

## Done When
- [x] Calendar has no oversized mixed-responsibility component/hook, no direct API fetch in UI, no `any`, and all Calendar verification commands pass.

## Notes
- Scope is limited to `frontend/web/features/calendar` plus Calendar-specific tests/config only.
- Task, Appointment, and document integration remain UI-only because their backend services are intentionally out of scope.
