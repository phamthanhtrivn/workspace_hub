export enum VoiceChatType {
  CHANNEL = 'CHANNEL',
  DIRECT_MESSAGE = 'DIRECT_MESSAGE',
}
export enum VoiceTranscriptDispatchStatus {
  PENDING = 'PENDING',
  DISPATCHED = 'DISPATCHED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
export const VOICE_TRANSCRIPT = {
  route: ':id/transcript',
  internalRoute: 'internal/voice-transcripts',
  maxBytes: 10 * 1024 * 1024,
  timeoutMs: 20000,
  maxResponseBytes: 256 * 1024,
  maxText: 60000,
  maxError: 500,
  dispatchIntervalMs: 10000,
  dispatchLeaseSeconds: 60,
  dispatchBatchSize: 4,
  dispatchAttempts: 3,
  dispatchRetrySeconds: 5,
  dispatchFailed: 'Background voice transcription could not be queued.',
  dispatchUnavailable: 'Background voice transcript dispatch unavailable.',
  responseMessage: 'Voice transcript',
  sourceMessage: 'Voice message source',
  unavailable: 'Voice transcription is unavailable or not configured.',
  unsupported: 'This attachment is not a supported voice message.',
  missing: 'Voice message is unavailable.',
} as const;
