# Calendar quick create

## Goal

Add a Google Calendar-like quick-create modal for Event, Task and Appointment schedule while keeping Event connected to Calendar Service and leaving cross-service tabs UI-only.

## Tasks

- [x] Add a focused quick-create component with Event/Task/Appointment tabs. Verify: each tab renders its matching fields.
- [x] Bind Event quick fields to the existing React Hook Form state. Verify: Save sends the current Calendar API payload.
- [x] Preserve entered Event data when “More options” opens the full editor. Verify: title, time, guests and location remain populated.
- [x] Add Task and Appointment UI-only states with clear connection feedback. Verify: no Project or Booking API is called.
- [x] Add Vietnamese and English copy for all quick-create controls. Verify: no raw UI strings remain.
- [x] Validate with frontend tests, TypeScript, Calendar lint and production build.

## Done When

- [x] Create opens the compact three-tab modal shown in the reference.
- [x] Event creation still works through Calendar Service.
- [x] Unsupported cross-service actions never pretend data was saved.

## Notes

ICS subscription is explicitly deferred. Keep the existing Tailwind system and Lucide icon family.
