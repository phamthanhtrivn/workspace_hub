# Recording optimization verification — 13 October 2026

- Recording search waits 300 ms after typing stops and trims the query.
- If deletion or access changes reduce the page count, the list returns to the last valid page.
- An open Share dialog uses the latest recording from the refreshed list.
- Pending requests and Starting/Pausing/Processing use 3-second recovery polling even with a connected socket. Stable connected rooms retain 30-second polling.
- A committed Start wakes local workers immediately. Five-second durable polling remains for separate processes and recovery; lane guards preserve concurrency limits.
- The recording template waits for a decoded video frame and two animation frames before signaling Egress, replacing the fixed 1.5-second delay. Application capture requires a video; camera layouts can start without video for audio-only meetings.

Verification:

- 23 frontend recording tests passed.
- 147 backend recording tests passed locally. All four FFmpeg integration tests passed separately inside the existing communication container.
- Browser tests against the frontend on port 3000 passed for live Share status, deleting the final item on page two, and a single API request from rapid search typing. Recording list API responses were fixtures; authentication used a temporary real account, removed afterwards.
- Frontend production build and backend TypeScript check passed. The frontend was restarted with the new build and the existing communication container was restarted to load the worker changes.
- A new real tab/Egress recording attempt reached the connected meeting but Start returned HTTP 429 for recording capacity. No new MP4 from this revision was verified. Existing user recordings were not stopped or deleted.
