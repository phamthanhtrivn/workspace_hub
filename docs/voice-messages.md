# Voice messages

Direct messages, channels and their threads share the voice player. It provides
Play/Pause, duration, keyboard seeking, and a waveform derived from the audio.
Only one player plays at a time. Audio larger than 2 MiB uses a progress track
instead of downloading and decoding a second copy for the waveform.

Recording selects a browser-supported MIME type and keeps the filename extension
consistent with that type (WebM, M4A or Ogg). Recording stops at five minutes;
recordings and transcription requests are limited to 10 MiB.

## Background transcription

Sending an audio attachment in a direct message, channel or thread automatically
registers a transcription request in the same database transaction as the message.
Dispatch runs in the background after commit, so sending does not wait for speech
recognition. Pending dispatches survive a Communication restart. This includes
uploaded audio files, with an extension fallback for generic binary uploads;
the existing 10 MiB and five-minute transcription limits still apply.

The **Convert to text** button keeps its existing behavior and appearance. It
returns the saved result when available, or joins/starts processing when needed.
There is one saved transcript per attachment and chat type, shared with anyone
who currently has permission to read the message. Closing the player, logging
out, logging in the next day or switching devices does not regenerate a completed
result. Changing the source invalidates its saved revision. Transcripts are not
added to message payloads, socket events, notifications or AI conversation history.

Communication checks access to the exact channel/direct message before proxying
requests and after waiting for the AI service. Recalled/deleted messages cannot
be transcribed. The AI worker rechecks access before downloading, before each
speech chunk and before saving a result, with additional checks during processing.
Read requests also recheck access even when a transcript is already cached.

The existing FFmpeg pipeline downloads only from `MEETING_MEDIA_HOSTS`, converts
to mono 16 kHz PCM16 WAV and splits into 45-second chunks. Voice and meeting jobs
share the existing speech queue with concurrency one. Speech stays in the local
faster-whisper worker; no LLM or additional transcription provider is involved.
Voice requests use automatic language detection and preserve the spoken language.
Meeting requests keep their existing Vietnamese default. Temporary audio is
removed after processing; chunk text is checkpointed for retries. Temporary HTTP,
network and timeout failures are retried with exponential backoff, up to three
attempts total. Invalid audio and denied access are not automatically retried.
After retries are exhausted, the existing player retry action remains available.

## Setup and rollout

1. Prepare the existing speech runtime using the
   [speech-worker instructions](../backend/ai-service/speech-worker/README.md).
   FFmpeg must be available at `MEETING_FFMPEG_PATH`; prepare the local multilingual
   model before starting speech-worker. Keep the existing service keys and media
   allowlist configured on the participating services.
2. Build AI API (`npm run build` in `backend/ai-service/api`), then run its existing
   migration command (`npm run migrate`). Migration `006_voice_transcripts.sql`
   creates the transcript table; `007_shared_voice_transcripts.sql` consolidates
   existing per-account rows, preferring a completed result, and adds the shared
   attachment/chat primary key. Pause AI API/jobs while upgrading the shared key.
3. In `backend/communication-service`, run `npx prisma migrate deploy` and
   `npx prisma generate`, then build. Migration
   `20261108000100_voice_transcript_requests` adds the durable background dispatch
   table. Stop Communication before generation on Windows if its Prisma engine
   DLL is in use. Existing message payloads remain unchanged.
4. Restart speech-worker, AI API, AI jobs and Communication before deploying the
   frontend. Docker uses the existing `meeting-summary` profile to start speech;
   the migration container runs before API/jobs.
5. `VOICE_TRANSCRIPTION_ENABLED=true` enables voice transcription on both AI API/jobs
   and Communication. If omitted, it inherits `MEETING_SUMMARY_ENABLED`. Set it to
   `false` to disable voice transcription independently. AI also requires its
   existing `AI_ENABLED=true` setting. Voice-only mode still needs the speech
   runtime and its existing `MEETING_STT_*` configuration.

The AI readiness endpoint checks the new table, voice worker heartbeat and speech
readiness when voice transcription is enabled. Failed/interrupted requests can
be retried from the player. Processing statuses are polled only while the user
has opened a pending transcript.

## Focused checks

From the repository root:

```powershell
node --test backend/security-tests/voice-transcript.test.mjs backend/security-tests/voice-background.test.mjs backend/security-tests/voice-recorder.test.mjs
```

With the existing local Docker AI/speech containers running, also run:

```powershell
$env:WORKSPACEHUB_VOICE_RUNTIME='1'
node --test backend/security-tests/voice-runtime.integration.test.mjs
```

These opt-in checks execute the latest source in isolated child processes. They
check real FFmpeg conversion, PostgreSQL constraints/deduplication in a temporary
table, and local Whisper inference on silence. They do not restart services or
write user tables. Override `VOICE_TEST_AI_CONTAINER` / `VOICE_TEST_SPEECH_CONTAINER`
if your local container names differ.

From `backend/ai-service/speech-worker`, using the configured Python environment:

```powershell
python -m unittest test_app.py
```

The Python contract tests use a fake recognizer and require `httpx` for FastAPI's
TestClient in the test environment. They do not download a model or establish
recognition quality on real audio. Also verify real recording/playback in Chrome
and Safari, shared results after logging in again, revoked membership, responsive layout,
and light/dark themes against a running stack before release.
