import type { ChatContextType } from "./chat.types";
export type VoiceChatType =
  ChatContextType.CHANNEL | ChatContextType.DIRECT_MESSAGE;
export interface VoiceTranscript {
  status: "NOT_CREATED" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  text: string | null;
  error: string | null;
}
