export const VOICE_TRANSCRIPT = {
  route: "internal/voice-transcripts",
  job: "voice-transcript",
  jobPrefix: "voice-",
  maxBytes: 10 * 1024 * 1024,
  maxSeconds: 300,
  maxText: 60000,
  timeoutMs: 30 * 60 * 1000,
  accessIntervalMs: 15000,
  heartbeatKey: "wh-notebook:voice-transcript-worker-heartbeat",
  heartbeatValue: "ready:voice-v1",
  failed: "Voice transcription failed. Please try again.",
  interrupted: "Voice transcription was interrupted. Please try again.",
  unavailable: "Voice transcription is unavailable or not configured.",
  tooLong: "Voice messages longer than 5 minutes cannot be transcribed.",
} as const;
export type VoiceChatType = "CHANNEL" | "DIRECT_MESSAGE";
export interface VoiceTranscriptState {
  actor_id: string;
  media_id: string;
  chat_type: VoiceChatType;
  revision: string;
  run_id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  chunks: { index: number; text: string }[];
  text: string | null;
  error: string | null;
}
