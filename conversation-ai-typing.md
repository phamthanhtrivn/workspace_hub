# AI typing indicator

- [x] Emit request-scoped typing events on claim, heartbeat and completion using authorized chat rooms.
- [x] Display animated, accessible dots in channels, DMs and individual threads; clean up on timeout/disconnect.
- [x] Test lifecycle, concurrency, scoping and the live browser flow; activate on the local server.

Verified 108 backend tests, 13 frontend tests, typecheck and production builds. Live Chromium confirmed real AI typing appears with three dots and disappears after the model reply; no JavaScript errors. Local Communication was restarted after draining the idle worker, then the worker resumed. Existing unrelated lint findings and unavailable Calendar endpoints remain unchanged.
