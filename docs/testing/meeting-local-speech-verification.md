# Local meeting speech verification ? 27/10/2026

Implemented and enabled local recognition in the intended AI/Communication/Docker env
files. The multilingual small model is downloaded locally and speech-worker responds
200 on its authenticated readiness route at 127.0.0.1:8090.

Actual public-audio check: MP4 ? FFmpeg WAV ? local Whisper ? Vietnamese transcript.
For the roughly 10-second public sample, the measured warm recognition time was about
3.2 seconds. It recognized the sentence with a minor word error; this does not prove
general accuracy. No user recording, Google API, or external summary call was used.

Evidence: [execution JSON](./meeting-local-speech-results.json).
Source: [public Vietnamese audio sample](https://huggingface.co/datasets/dinhlam2210/voice-Viet-Nam/blob/main/data/audio_014.wav).

The local worker tests cover authentication, model readiness, malformed/oversized WAV,
empty/failed recognition and concurrent requests. Node tests cover the bridge,
transcript retries/checkpoints, permissions and local-speech health dependency.

Full deployed UI flow remains unverified: Docker Desktop's engine returns HTTP 500,
AI API and Communication on 8087/8083 are unreachable, and the host AI DATABASE_URL is
still a placeholder. Existing unrelated database settings were preserved.

Verification totals: local Python worker **6/6 passed**; focused AI meeting/readiness tests **22/22 passed**. Full AI suite: **164/165 passed**. The remaining pre-existing failure is `security-setup.test.cjs` importing missing `backend/scripts/configure-ai-security.mjs`; that unrelated script was already absent before this work. Docker Desktop reports running but its engine API times out/returns 500, so application activation could not be validated.
