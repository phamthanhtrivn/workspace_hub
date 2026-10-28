## Update 27/10/2026: local speech

Recognition now runs locally with faster-whisper small on CPU. Google STT is no longer used. FFmpeg and the local worker were executed successfully against a public Vietnamese sample; the runtime worker is ready on localhost:8090. Setup and current deployment blockers are documented in [MEETING_SUMMARY.md](backend/ai-service/MEETING_SUMMARY.md) and [verification](docs/testing/meeting-local-speech-verification.md). The implementation/verification notes below describe the earlier Google-based version.

# Meeting recording summary

Implement an owner-triggered summary of a completed recording: FFmpeg -> Google
Speech-to-Text V2 (`chirp_3`, Vietnamese) -> configured Vibi model. Shared viewers
can read the result through existing recording permissions. No automatic task creation.

- [x] Add authenticated Communication/AI bridge and durable summary state.
- [x] Add bounded recording download, FFmpeg audio chunks and Google STT client.
- [x] Add checkpointed transcript and hierarchical, evidence-based summaries on a dedicated queue.
- [x] Add summary controls to the recording player using existing design tokens.
- [x] Add configuration/deployment instructions and verify builds, permissions, retry/cancellation and provider contracts.

Real paid recognition requires a configured Google Cloud project and service-account
credentials; do not send meeting recordings during development checks.

Verification: AI build + 146 tests passed; Communication build + 6 new tests
passed; frontend typecheck + 3 rendering tests passed; targeted ESLint passed.
FFmpeg is not installed on the host and Docker is not running. Actual FFmpeg
execution, paid Google/Vibi recognition and browser end-to-end behavior remain
unverified. The feature defaults to disabled until configured. Setup details:
`backend/ai-service/MEETING_SUMMARY.md`.

Follow-up optimization: bounded speech concurrency (default 2), ordered sparse
transcript checkpoints, complete-transcript audio bypass, versioned note caches
and per-stage timing/HTTP-status diagnostics. AI build and all 150 tests passed.
Run the idempotent AI migration before restarting with these optimizations.
