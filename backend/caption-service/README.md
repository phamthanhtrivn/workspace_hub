# Live meeting captions

Self-hosted Vietnamese live captions powered by [WhisperLiveKit](https://github.com/QuentinFuxa/WhisperLiveKit), pinned to **0.2.26** (Apache-2.0). A LiveKit agent receives each participant's microphone as 16 kHz mono PCM. WhisperLiveKit provides VAD, buffering, incremental recognition and stable hypotheses; speaker names come from the original LiveKit participants.

The meeting frontend exposes a **CC** button. Captions are local display preferences; one room worker is shared by all viewers. The room shows **Live captions active** while audio is being processed. Turning off the last viewer stops the worker. Viewer leases expire after 90 seconds if a browser crashes or no longer renews its lease. The agent disconnects when the meeting ends or no human participants remain.

## Run with the existing Docker stack

Set matching values in the environment used by Compose:

```text
CAPTION_SERVICE_URL=http://caption-service:8095
CAPTION_SERVICE_TOKEN=<a random internal service secret>
LIVEKIT_API_KEY=<existing LiveKit key>
LIVEKIT_API_SECRET=<existing LiveKit secret>
CAPTION_MODEL=small
```

The root stack includes `caption-service/docker-compose.yml`. Enable the `captions` profile and build/start the service, then recreate communication-service with the matching token and URL:

```powershell
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.yml --profile captions up -d --build caption-service
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.yml up -d --no-deps communication-service
```

Run those commands from `workspace_hub`, with the existing stack's LiveKit variables configured. The caption service has no published host port. Its control API requires the internal bearer token; clients use the authenticated meeting API instead. Do not expose the internal token in browser environment variables or commit it to Git.

CPU inference uses INT8, four threads and greedy decoding through a small adapter for the pinned WLK backend. For NVIDIA GPU inference, use the GPU override:

```powershell
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.yml -f backend/caption-service/docker-compose.gpu.yml --profile captions up -d --build caption-service
```

The GPU image installs cuBLAS 12.3 and cuDNN 9.1; Docker must have NVIDIA GPU access and a compatible driver. It uses `int8_float16`. The model is downloaded on first start and retained in `caption_models`; health becomes available after loading and warmup. The current development startup helper is `.runtime/start-meeting-recording.ps1` outside the repository and reads an untracked internal secret from `.runtime/caption-service.env`.

## API and limits

- `GET /api/meetings/:joinToken/captions`: authenticated joined participant; returns availability and language.
- `POST /api/meetings/:joinToken/captions`: checks joined status and a live room connection; starts/renews that viewer's lease and returns the worker identity.
- `DELETE /api/meetings/:joinToken/captions`: releases only the authenticated viewer.
- LiveKit data topic `wh.meeting.captions`: bounded caption snapshots with speaker ID/name, audio track ID, sequence and tentative/final state. The frontend accepts packets only from `captions:<meeting UUID>`.

The development defaults allow two rooms and four microphone tracks per room. These are resource guards, not demonstrated throughput guarantees. Tune and load-test on deployment hardware. Audio backlog is bounded; overload reports an error instead of growing indefinitely. Recognition can mishear names, accents or technical vocabulary. No translation, recording subtitles, transcript storage or burned-in captions are included in this feature.

## Verification

### Local Windows environment

This workspace has an isolated Python 3.13 environment at `.runtime/caption-venv` beside the `workspace_hub` checkout. It includes the pinned packages in `requirements.txt` and CPU builds of PyTorch/torchaudio. From `backend/caption-service`, use its interpreter directly:

```powershell
../../../.runtime/caption-venv/Scripts/python.exe -m pip check
../../../.runtime/caption-venv/Scripts/python.exe -m unittest discover -s tests -v
```

On 13/10/2026, runtime imports and dependency checks passed, and all 11 Python tests passed. Recognition model weights and the LiveKit connection are initialized when the caption service starts; this dependency verification does not start the live service.

```powershell
# From caption-service (dependencies installed)
python -m unittest discover -s tests -v
# From communication-service
npx jest --runInBand meeting-captions.service.spec.ts
# From frontend/web
npm run test:captions
```

See [real browser/audio verification results](../../meeting-captions-verification.md), including measured time to captions and observed Vietnamese recognition errors.
