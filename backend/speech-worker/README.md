# Local speech worker

See [architecture](../../docs/architecture.md), [Notebook AI setup](../../deploy/ai/README.md) and [LiveKit infrastructure](../livekit/README.md).

Private CPU inference using faster-whisper. Start with `node backend/scripts/start-local-speech.mjs` from the repository root after configuration. No Google credentials are needed.

For host execution, the launcher uses `MEETING_STT_PYTHON` from the AI env or the existing `backend/ai-service/.venv` Python. Install `backend/speech-worker/requirements.txt` in that environment; the host configuration helper also needs `imageio-ffmpeg==0.6.0` to locate FFmpeg. Do not overwrite an existing runtime environment.

Run `prepare.py` from this service directory to prepare model files before starting. `STT_MODEL_PATH` selects the local model; the launcher defaults to `models/small` under this service. Keep `MEETING_STT_SERVICE_KEY` in the AI env matched to the worker's `SPEECH_SERVICE_KEY`. Configure model/media access before enabling meeting summaries.

The service accepts bounded mono 16 kHz PCM16 WAV, at most 46 seconds per request. It performs one CPU inference at a time; readiness and a valid response do not establish recognition quality on real meeting audio. Live captions are a separate integration from this recording-summary worker.
