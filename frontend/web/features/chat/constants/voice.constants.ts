export const VOICE = {
  maxSeconds: 300,
  maxBytes: 10 * 1024 * 1024,
  waveformBars: 48,
  waveformBytes: 2 * 1024 * 1024,
  pollMs: 2000,
  playEvent: "workspacehub:voice-play",
} as const;

export const VOICE_LABELS = {
  play: "Play voice message",
  pause: "Pause voice message",
  seek: "Seek voice message",
  transcript: "Voice transcript",
  convert: "Convert to text",
  hide: "Hide transcript",
  show: "Show transcript",
  working: "Transcribing…",
  retry: "Retry transcription",
  playbackFailed: "This voice message could not be played.",
  retryPlayback: "Retry playback",
  failed: "Could not transcribe this voice message. Please try again.",
  empty: "No speech was recognized.",
  unsupported: "Voice recording is not supported in this browser.",
  tooLong: "Voice messages are limited to 5 minutes.",
  tooLarge: "Voice message exceeds the 10 MiB limit.",
} as const;
