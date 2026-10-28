# Meeting recording summaries with local speech recognition

The owner of a completed recording can request a summary in the recording player.
The pipeline is **FFmpeg ? faster-whisper on local CPU ? existing configured summary model**.
No Google project, Google service account, or paid speech API is required.
Only recognition is local: the resulting text is still sent to the configured summary model.

## Implementation choice

A separate Python worker loads the multilingual Whisper `small` model once, using CPU
`int8`. The Node job worker downloads the authorized recording, uses FFmpeg to create
mono 16 kHz PCM16 WAV chunks of at most 45 seconds, and submits them to the private
local worker. This avoids reloading the model for every chunk and keeps ML dependencies
out of the Node image. Reference: https://github.com/SYSTRAN/faster-whisper

The worker accepts raw WAV only, never media URLs or file paths. It requires its own
internal key, bounds input to 2 MiB/46 seconds and output to 12,000 characters, and
runs one inference at a time. Audio stays in memory; access logs are disabled.
Readiness requires the model to be loaded. Model weights are downloaded during setup;
runtime uses local files only and offline mode.

CPU recognition uses one chunk at a time. When summaries are enabled, configuration
validation rejects MEETING_STT_CONCURRENCY values above 1 because the local worker
would reject overlapping requests with HTTP 429. Existing per-recording permissions,
periodic permission checks, transcript checkpoints, explicit retries and summary-cache
behavior are preserved. A completed transcript can be reused even after changing STT.
Whisper can misrecognize names, accents or background speech; verify important details.

## Local Windows setup

From the repository root:

```powershell
python -m venv backend/ai-service/.venv
backend/ai-service/.venv/Scripts/python.exe -m pip install -r backend/speech-worker/requirements-dev.txt
backend/ai-service/.venv/Scripts/python.exe backend/speech-worker/prepare.py
node backend/scripts/configure-local-speech.mjs
node backend/scripts/start-local-speech.mjs
```

The configure script preserves unrelated env settings, derives the exact allowed S3
recording host from Communication's intended storage configuration, creates a dedicated
speech key, enables `MEETING_SUMMARY_ENABLED=true` in AI/Communication/deploy env files,
and configures the local FFmpeg binary shipped by imageio-ffmpeg. It does not print keys.

Then build/migrate/restart AI API, AI job worker and Communication Service:

```powershell
cd backend/ai-service
npm.cmd run build
npm.cmd run migrate
npm.cmd start
# In another terminal in backend/ai-service:
npm.cmd run worker
# Restart the existing Communication Service using its usual development command.
```

The existing PostgreSQL/Redis/Document/RAG dependencies must be available.
The repository's host AI .env may contain a placeholder DATABASE_URL; configure the
actual application database before starting it. Do not point production at the demo SQL.

Configuration:

| Setting | Purpose |
| --- | --- |
| MEETING_SUMMARY_ENABLED | Enable in both AI and Communication |
| MEETING_STT_URL | http://127.0.0.1:8090 locally; http://speech-worker:8090 in Docker |
| MEETING_STT_SERVICE_KEY | Dedicated shared secret for local speech; minimum 32 characters |
| MEETING_STT_CONCURRENCY | Default 1 for CPU |
| MEETING_STT_TIMEOUT_MS | Default 180000 per chunk |
| MEETING_STT_CPU_THREADS | Default 4 |
| MEETING_STT_MODEL_PATH | Local downloaded model directory (host launcher) |
| MEETING_STT_PYTHON | Virtualenv Python path (host launcher) |
| MEETING_FFMPEG_PATH | FFmpeg executable; installed in AI Docker image |
| MEETING_MEDIA_HOSTS | Exact trusted recording host(s), no wildcard |
| AI_COMMUNICATION_SERVICE_KEY | Existing AI/Communication key, must match |

## Docker

`deploy/ai/compose.yml` includes `speech-worker` in the optional `meeting-summary` profile (explicitly targeting the service enables it). It is reachable only inside the Docker network. Its image embeds the public `small`
model at build time. The AI image still contains FFmpeg; speech-worker contains Python
and Whisper. Keep the internal keys in the intended .env, never in committed examples.

```powershell
docker compose -f deploy/ai/compose.yml build speech-worker notebook-api notebook-jobs migrate
docker compose -f deploy/ai/compose.yml up -d speech-worker notebook-api notebook-jobs
```

If AI is enabled, its `/ready` check now also checks authenticated speech-worker
readiness. Allow roughly 3 GiB for speech-worker. Long recordings take longer on CPU;
the worker keeps its existing per-run deadline and checkpoints.

## Verification

```powershell
cd backend/speech-worker
../ai-service/.venv/Scripts/python.exe -m unittest test_app -v
cd ../ai-service
npm.cmd run build
node --test test/meeting-summary.test.cjs test/meeting-summary-controller.test.cjs test/stability.test.cjs
```

A separate real execution check uses a short public Vietnamese audio sample, converted
to MP4, then downloads it from a loopback fixture server and runs actual FFmpeg and
actual local Whisper. It does not read meeting recordings or call cloud STT/summary:
`node backend/scripts/test-local-speech.cjs`.
This expects `../.tmp/meeting-local-speech/sample.mp4`, prepared from the sample
linked in `docs/testing/meeting-local-speech-results.json`.

The real check confirms execution, not general recognition accuracy. The deployment's
full recording/UI flow additionally requires working application services and Docker.
