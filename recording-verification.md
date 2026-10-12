# Recording verification

Verify the recording feature against the running PostgreSQL, LiveKit, Egress, S3 and frontend, using temporary test accounts and rooms.

- [ ] Run all recording backend and frontend tests, including real FFmpeg checks.
- [ ] Exercise the host UI with synthetic camera, microphone and screen media; confirm Start, REC, Stop and completed MP4.
- [ ] Check Pause/Resume, recording layouts and automatic recording.
- [ ] Check member recording permission, owner access, sharing, revocation and deletion.
- [ ] Download and inspect the real MP4 for video, audio, duration and playback.
- [ ] Fix failures, repeat affected checks, and clean up temporary accounts, rooms and S3 files.

Results and limitations will be recorded here after verification.
