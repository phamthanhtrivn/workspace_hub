# Google Calendar-like frontend

## Goal

Upgrade Workspace Hub Calendar to use maintained libraries for standard behavior and provide a familiar Google Calendar-like workflow without changing the existing API contract.

## Tasks

- [x] Audit current Calendar interactions, responsive states and form logic. Verify: document preserved behavior and library gaps.
- [x] Add direct frontend dependencies for recurrence, form state and validation. Verify: lockfile resolves without peer conflicts.
- [x] Replace custom RRULE construction and parsing with the `rrule` package while preserving backend RRULE strings. Verify: preset and custom recurrence tests pass.
- [x] Refactor event editing around React Hook Form and Zod with progressive advanced fields. Verify: create/edit payloads remain API-compatible.
- [x] Polish toolbar, sidebar, grid, permissions and responsive behavior to match familiar Google Calendar interactions. Verify: month/week/day/list, drag, resize and mobile controls work.
- [x] Add focused frontend tests for recurrence and form validation. Verify: invalid ranges and malformed recurrence are rejected.
- [x] Run lint, type-check, production build and browser smoke checks. Verify: no new Calendar lint or type errors and the production route responds.

## Done When

- [x] Calendar uses library-backed recurrence and form validation.
- [x] Core Google Calendar-like workflow works on desktop and mobile.
- [x] Existing Calendar API, occurrence storage and recurrence scopes remain compatible.

## Notes

Use FullCalendar Community features only. Keep Workspace Hub colors and the existing Tailwind design system.
