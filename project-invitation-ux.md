# Project invitation UX

## Goal

Make project invitations easy to find and manage while keeping the notification bell consistent with invitation state.

## Implementation

- Add project-scoped pending invitation API, resend, and cancellation status propagation.
- Expand user search from email-only to name or email.
- Add frontend queries and mutations for pending, resend, and cancel.
- Redesign the invite dialog to filter members, show pending state, and remain open after a successful invite.
- Surface pending invitations in the project member panel.

## Verification

- Backend unit tests for invitation lifecycle.
- User service tests/build for name-or-email search.
- Frontend lint, TypeScript check, and production build.
- Confirm notification bell integration from outbox through realtime update.
