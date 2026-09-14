# Project realtime

## Goal
Add authenticated Socket.IO updates for Project Service and refresh affected Project queries in the web app without changing existing REST contracts.

## Tasks
- [x] Extract reusable JWT verification and secure socket connections and project-room joins.
- [x] Publish a typed project change event after successful REST mutations.
- [x] Route `/project.io` through both Kong configurations.
- [x] Add the web socket manager and map events to TanStack Query invalidations.
- [x] Cover JWT, room authorization, event mapping, and publisher behavior with tests.
- [x] Run backend/frontend lint, tests, and builds.

## Done When
- [x] Two authenticated project members receive project-domain invalidation events.
- [x] Invalid tokens and non-members cannot subscribe to project rooms.
- [x] Existing REST behavior and test suites remain green.

## Notes
- Single Project Service instance for now; Redis adapter is intentionally deferred.
- Socket payloads are invalidation events, not authoritative entity snapshots.
