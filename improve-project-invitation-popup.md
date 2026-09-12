# Improve project invitation popup

## Goal
Show enough project and inviter identity in project invitation notifications without breaking existing notifications.

## Tasks
- [x] Add project icon and color to new/resend invitation notification metadata. Verify: outbox payload contains both fields.
- [x] Enrich project notification sender data from the user directory. Verify: notification delivery includes inviter name and avatar.
- [x] Redesign project invitation list item and modal with project identity, inviter identity, expiry, and status fallbacks.
- [x] Add English and Vietnamese message keys and renderer regression tests.
- [x] Run backend tests/compile and frontend i18n, tests, lint, and scoped typecheck.

## Done When
- [x] A recipient can identify the project and inviter before accepting or declining, including graceful display for legacy payloads.

## Notes
Existing invitation response behavior and permission policy remain unchanged.
