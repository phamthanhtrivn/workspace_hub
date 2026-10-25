# Meeting recording summaries

The owner opens a completed recording and clicks **Tóm tắt bằng AI**. Communication
Service checks the recording JWT and ownership. AI Service checks its internal key,
then queues the recording ID and a run ID; signed URLs and credentials are not put
in Redis. Shared viewers can read summaries using the same recording permissions.

The dedicated `meeting-summary-jobs` worker downloads the recording to a unique
temporary directory, uses FFmpeg to extract mono PCM WAV at 16 kHz in 45-second
chunks, and sends chunks sequentially to Google Speech-to-Text V2 `chirp_3`,
`vi-VN`. It sends the transcript to the configured Conversation/Vibi model.
Long transcripts are summarized in batches and then merged. No tasks are created.

## Setup

1. Enable Speech-to-Text API and billing in a Google Cloud project. Grant the
   service account Speech Client (`roles/speech.client`) and configure Application
   Default Credentials on the AI worker (`GOOGLE_APPLICATION_CREDENTIALS` for a
   local service-account JSON, or workload identity on Google Cloud).
2. Set `MEETING_SUMMARY_ENABLED=true` on Communication Service and AI API/jobs.
   Keep `AI_ENABLED=true` on AI Service. Reuse the existing dedicated
   `AI_COMMUNICATION_SERVICE_KEY` link credential and configure reachable
   `COMMUNICATION_SERVICE_URL` / `AI_SERVICE_URL`.
3. Set `GOOGLE_CLOUD_PROJECT`, `GOOGLE_STT_LOCATION=us` (or `eu`), and
   `MEETING_MEDIA_HOSTS` to the exact S3 signed-URL host. Production requires HTTPS;
   development allows an explicitly listed HTTP MinIO host with port.
4. FFmpeg is installed by the AI Dockerfile. For local Node workers, install it
   and configure `MEETING_FFMPEG_PATH` if it is not on PATH.
5. Build and run `npm run migrate` in AI Service to apply `002_meeting_summaries.sql`,
   then restart AI API, worker, Communication Service and the frontend.

For Docker, mount credentials only on the worker through a local Compose override:

```yaml
services:
  notebook-jobs:
    volumes:
      - ./secrets/google-speech.json:/run/secrets/google-speech.json:ro
    environment:
      GOOGLE_APPLICATION_CREDENTIALS: /run/secrets/google-speech.json
```

Do not commit the override's credentials. Google authentication uses the official
`google-auth-library`; no private-key signing is implemented in application code.

## Limits and recovery

- Defaults: 2 hours, 1 GiB recording, one active meeting job per worker process,
  45-minute processing deadline and 5-minute download/extraction timeout each.
  Provider quota may require lower limits. Temporary disk capacity is checked.
- Creation is idempotent per recording revision. Repeated clicks return the
  existing queued/running/completed summary. Only a failed run or a changed
  recording revision starts another run. A retry may incur more provider charges.
- Transcript chunks and intermediate notes are checkpointed in PostgreSQL. On
  explicit retry of the same revision, completed results are reused. An interrupted
  or unknown provider outcome is never automatically replayed. Recovery marks
  missing/failed jobs as failed and leaves active jobs under BullMQ control.
- Recording access/revision is rechecked before each provider request, every
  15 seconds during processing, and before saving the final answer. Reading always
  rechecks recording access in Communication Service. A deleted recording's result
  cannot be read through the API. Summary/transcript rows remain in the separate
  AI database until administratively removed; include them in retention policies.
- Temporary files are deleted after each attempt. SIGKILL/machine failure may
  leave `meeting-summary-*` directories; operations should sweep abandoned
  directories only after confirming there are no active jobs using them.
- No speaker diarization is enabled for mixed Vietnamese audio. Names are taken
  only from the spoken text; timestamps refer to the start of 45-second chunks.
  Chunk boundaries can cut an utterance. Review transcript quality against actual
  meeting recordings before relying on action items or decisions.
- This does not replace or change the existing live-caption feature.

## Verification

Run AI Service `npm test`; run the Communication meeting-summary controller tests,
its build, and frontend `npm run typecheck`. Automated contract tests mock Google
and Vibi and do not incur transcription charges. A real paid end-to-end check
requires configured Google credentials and a representative recording.

Provider references:
- https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3
- https://docs.cloud.google.com/speech-to-text/v2/docs/reference/rest/v2/projects.locations.recognizers/recognize
